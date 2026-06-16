import { eq, lte, isNull, and } from 'drizzle-orm'
import { products, inventory, inventoryMovements } from '@dorothea/db/schema'
import { NotFoundError } from '../utils/errors.ts'
import type { DbClient } from '../db/connection.ts'
import type { AdjustStockInput } from '@dorothea/validators/inventory'

export async function adjustStock(
  db: DbClient,
  productId: string,
  input: AdjustStockInput,
  userId: number,
) {
  const [stock] = await db.select().from(inventory).where(eq(inventory.productId, productId)).limit(1)
  if (!stock) throw new NotFoundError('Producto sin registro de inventario')

  const newQuantity = stock.quantity + input.quantityChange
  if (newQuantity < 0) throw new NotFoundError('El ajuste deja el stock en negativo')

  await db
    .update(inventory)
    .set({ quantity: newQuantity, updatedAt: new Date().toISOString() })
    .where(eq(inventory.productId, productId))

  const [movement] = await db
    .insert(inventoryMovements)
    .values({
      productId,
      quantityChange: input.quantityChange,
      type: 'ADJUSTMENT',
      referenceType: 'MANUAL',
      notes: input.notes,
      userId,
    })
    .returning()

  return { quantity: newQuantity, movement }
}

export async function listMovements(db: DbClient, productId: string) {
  return db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(inventoryMovements.createdAt)
}

export async function listLowStock(db: DbClient) {
  return db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      minStock: products.minStock,
      quantity: inventory.quantity,
    })
    .from(products)
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .where(and(isNull(products.deletedAt), eq(products.active, true), lte(inventory.quantity, products.minStock)))
}
