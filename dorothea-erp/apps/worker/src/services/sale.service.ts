import { eq, desc, sql } from 'drizzle-orm'
import {
  sales,
  saleItems,
  products,
  ivaRates,
  inventory,
  inventoryMovements,
  cashMovements,
  customers,
} from '@dorothea/db/schema'
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.ts'
import { getOpenSession } from './cash-register.service.ts'
import type { DbClient } from '../db/connection.ts'
import type { CreateSaleInput, SaleSearchInput } from '@dorothea/validators/sale'

interface PricedItem {
  productId: string
  productName: string
  quantity: number
  unitPriceCents: number
  discountCents: number
  ivaRate: number
  ivaAmountCents: number
  subtotalCents: number
  availableStock: number
}

async function priceItems(db: DbClient, items: CreateSaleInput['items']): Promise<PricedItem[]> {
  const priced: PricedItem[] = []

  for (const item of items) {
    const [row] = await db
      .select({
        id: products.id,
        name: products.name,
        priceCents: products.priceCents,
        active: products.active,
        ivaRate: ivaRates.rate,
        quantity: inventory.quantity,
      })
      .from(products)
      .leftJoin(ivaRates, eq(products.ivaRateId, ivaRates.id))
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(eq(products.id, item.productId))
      .limit(1)

    if (!row || !row.active) throw new NotFoundError(`Producto no encontrado: ${item.productId}`)

    const available = row.quantity ?? 0
    if (available < item.quantity) {
      throw new ConflictError(`Stock insuficiente para "${row.name}" (disponible: ${available})`)
    }

    const rate = row.ivaRate ?? 0
    const lineGross = row.priceCents * item.quantity - item.discountCents
    if (lineGross < 0) throw new ValidationError(`El descuento supera el subtotal del producto "${row.name}"`)

    const ivaAmountCents = Math.round((lineGross * rate) / (10000 + rate))

    priced.push({
      productId: row.id,
      productName: row.name,
      quantity: item.quantity,
      unitPriceCents: row.priceCents,
      discountCents: item.discountCents,
      ivaRate: rate,
      ivaAmountCents,
      subtotalCents: lineGross,
      availableStock: available,
    })
  }

  return priced
}

export async function createSale(db: DbClient, input: CreateSaleInput, userId: number) {
  const session = await getOpenSession(db)
  if (!session) throw new ConflictError('No hay una caja abierta. Abrí una caja antes de vender.')

  if (input.customerId) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1)
    if (!customer) throw new NotFoundError('Cliente no encontrado')
  }

  const pricedItems = await priceItems(db, input.items)

  const subtotalCents = pricedItems.reduce((acc, i) => acc + i.subtotalCents, 0)
  const totalIvaCents = pricedItems.reduce((acc, i) => acc + i.ivaAmountCents, 0)
  const totalCents = subtotalCents - input.discountCents

  if (totalCents < 0) throw new ValidationError('El descuento total supera el subtotal de la venta')
  if (input.amountPaidCents < totalCents) throw new ValidationError('El monto pagado es insuficiente')

  const changeCents = input.amountPaidCents - totalCents

  const [sale] = await db
    .insert(sales)
    .values({
      customerId: input.customerId ?? null,
      userId,
      cashRegisterSessionId: session.id,
      subtotalCents,
      discountCents: input.discountCents,
      totalIvaCents,
      totalCents,
      paymentMethod: input.paymentMethod,
      amountPaidCents: input.amountPaidCents,
      changeCents,
      notes: input.notes ?? null,
    })
    .returning()

  if (!sale) throw new ConflictError('No se pudo registrar la venta')

  for (const item of pricedItems) {
    await db.insert(saleItems).values({
      saleId: sale.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      discountCents: item.discountCents,
      ivaRate: item.ivaRate,
      ivaAmountCents: item.ivaAmountCents,
      subtotalCents: item.subtotalCents,
    })

    await db
      .update(inventory)
      .set({ quantity: item.availableStock - item.quantity, updatedAt: new Date().toISOString() })
      .where(eq(inventory.productId, item.productId))

    await db.insert(inventoryMovements).values({
      productId: item.productId,
      quantityChange: -item.quantity,
      type: 'SALE',
      referenceId: sale.id,
      referenceType: 'SALE',
      notes: `Venta ${sale.id}`,
      userId,
    })
  }

  await db.insert(cashMovements).values({
    sessionId: session.id,
    type: 'INCOME',
    amountCents: totalCents,
    paymentMethod: input.paymentMethod,
    description: `Venta ${sale.id}`,
    referenceId: sale.id,
    referenceType: 'SALE',
    userId,
  })

  return getSaleById(db, sale.id)
}

export async function getSaleById(db: DbClient, id: string) {
  const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1)
  if (!sale) throw new NotFoundError('Venta no encontrada')

  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id))
  return { sale, items }
}

export async function listSales(db: DbClient, params: SaleSearchInput) {
  const where = params.status ? eq(sales.status, params.status) : undefined
  const offset = (params.page - 1) * params.pageSize

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(sales)
      .where(where)
      .orderBy(desc(sales.createdAt))
      .limit(params.pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(sales).where(where),
  ])

  return { data: rows, total: countRows[0]?.count ?? 0, page: params.page, pageSize: params.pageSize }
}

export async function cancelSale(db: DbClient, id: string, userId: number) {
  const { sale, items } = await getSaleById(db, id)
  if (sale.status === 'CANCELLED') throw new ConflictError('La venta ya está cancelada')

  const openSession = await getOpenSession(db)
  if (!openSession || openSession.id !== sale.cashRegisterSessionId) {
    throw new ConflictError('Solo se puede cancelar una venta de la caja actualmente abierta')
  }

  for (const item of items) {
    const [stockRow] = await db.select().from(inventory).where(eq(inventory.productId, item.productId)).limit(1)
    if (stockRow) {
      await db
        .update(inventory)
        .set({ quantity: stockRow.quantity + item.quantity, updatedAt: new Date().toISOString() })
        .where(eq(inventory.productId, item.productId))
    }

    await db.insert(inventoryMovements).values({
      productId: item.productId,
      quantityChange: item.quantity,
      type: 'RETURN',
      referenceId: sale.id,
      referenceType: 'SALE',
      notes: `Cancelación de venta ${sale.id}`,
      userId,
    })
  }

  await db.insert(cashMovements).values({
    sessionId: sale.cashRegisterSessionId,
    type: 'EXPENSE',
    amountCents: sale.totalCents,
    paymentMethod: sale.paymentMethod,
    description: `Cancelación de venta ${sale.id}`,
    referenceId: sale.id,
    referenceType: 'SALE',
    userId,
  })

  const [updated] = await db.update(sales).set({ status: 'CANCELLED' }).where(eq(sales.id, id)).returning()

  return updated
}
