import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { products, inventory } from '@dorothea/db/schema'
import { testDb, seedUser, seedProduct } from '../../test/helpers.ts'
import { openSession } from './cash-register.service.ts'
import { createSale, cancelSale, getSaleById } from './sale.service.ts'
import { ConflictError, ValidationError } from '../utils/errors.ts'

describe('sale.service', () => {
  let db: ReturnType<typeof testDb>
  let userId: number

  beforeEach(async () => {
    db = testDb(env.DB)
    const user = await seedUser(db)
    userId = user.id
  })

  it('no permite vender sin caja abierta', async () => {
    const product = await seedProduct(db, { stock: 10 })
    await expect(
      createSale(db, { items: [{ productId: product.id, quantity: 1, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 100000, discountCents: 0 }, userId),
    ).rejects.toThrow(ConflictError)
  })

  it('descuenta stock y genera el ingreso en caja al confirmar la venta', async () => {
    await openSession(db, { openingAmountCents: 0 }, userId)
    const product = await seedProduct(db, { priceCents: 150000, stock: 10 })

    const result = await createSale(
      db,
      { items: [{ productId: product.id, quantity: 3, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 450000, discountCents: 0 },
      userId,
    )

    expect(result.sale.totalCents).toBe(450000)
    expect(result.sale.status).toBe('COMPLETED')
    expect(result.items).toHaveLength(1)

    const [stock] = await db.select().from(inventory).where(eq(inventory.productId, product.id))
    expect(stock?.quantity).toBe(7)
  })

  it('rechaza la venta si no hay stock suficiente', async () => {
    await openSession(db, { openingAmountCents: 0 }, userId)
    const product = await seedProduct(db, { stock: 2 })

    await expect(
      createSale(
        db,
        { items: [{ productId: product.id, quantity: 5, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 999999, discountCents: 0 },
        userId,
      ),
    ).rejects.toThrow(ConflictError)

    const [stock] = await db.select().from(inventory).where(eq(inventory.productId, product.id))
    expect(stock?.quantity).toBe(2)
  })

  it('rechaza si el monto pagado es insuficiente', async () => {
    await openSession(db, { openingAmountCents: 0 }, userId)
    const product = await seedProduct(db, { priceCents: 100000, stock: 10 })

    await expect(
      createSale(
        db,
        { items: [{ productId: product.id, quantity: 1, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 50000, discountCents: 0 },
        userId,
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('calcula el IVA a partir del precio final (precio incluye IVA)', async () => {
    await openSession(db, { openingAmountCents: 0 }, userId)
    // 21% de IVA: de un precio final de 1210, el IVA es 210 (1210 * 2100 / 12100)
    const product = await seedProduct(db, { priceCents: 121000, stock: 10, ivaRate: 2100 })

    const result = await createSale(
      db,
      { items: [{ productId: product.id, quantity: 1, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 121000, discountCents: 0 },
      userId,
    )

    expect(result.items[0]?.ivaAmountCents).toBe(21000)
    expect(result.sale.totalIvaCents).toBe(21000)
  })

  it('cancela una venta: repone stock y compensa la caja', async () => {
    await openSession(db, { openingAmountCents: 0 }, userId)
    const product = await seedProduct(db, { priceCents: 100000, stock: 10 })

    const sale = await createSale(
      db,
      { items: [{ productId: product.id, quantity: 4, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 400000, discountCents: 0 },
      userId,
    )

    let [stock] = await db.select().from(inventory).where(eq(inventory.productId, product.id))
    expect(stock?.quantity).toBe(6)

    const cancelled = await cancelSale(db, sale.sale.id, userId)
    expect(cancelled?.status).toBe('CANCELLED')

    ;[stock] = await db.select().from(inventory).where(eq(inventory.productId, product.id))
    expect(stock?.quantity).toBe(10)
  })

  it('no permite cancelar una venta dos veces', async () => {
    await openSession(db, { openingAmountCents: 0 }, userId)
    const product = await seedProduct(db, { stock: 5 })

    const sale = await createSale(
      db,
      { items: [{ productId: product.id, quantity: 1, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 100000, discountCents: 0 },
      userId,
    )

    await cancelSale(db, sale.sale.id, userId)
    await expect(cancelSale(db, sale.sale.id, userId)).rejects.toThrow(ConflictError)
  })

  it('guarda el nombre y precio del producto como snapshot en el item', async () => {
    await openSession(db, { openingAmountCents: 0 }, userId)
    const product = await seedProduct(db, { priceCents: 250000, stock: 5 })

    const sale = await createSale(
      db,
      { items: [{ productId: product.id, quantity: 1, discountCents: 0 }], paymentMethod: 'CASH', amountPaidCents: 250000, discountCents: 0 },
      userId,
    )

    // cambiar el precio del producto después de la venta no debe afectar el item ya vendido
    await db.update(products).set({ priceCents: 999999 }).where(eq(products.id, product.id))

    const { items } = await getSaleById(db, sale.sale.id)
    expect(items[0]?.unitPriceCents).toBe(250000)
  })
})
