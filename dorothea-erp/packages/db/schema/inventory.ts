import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { products } from './products.ts'
import { users } from './users.ts'

export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  productId: text('product_id').notNull().unique().references(() => products.id),
  quantity: integer('quantity').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const inventoryMovements = sqliteTable('inventory_movements', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  productId: text('product_id').notNull().references(() => products.id),
  quantityChange: integer('quantity_change').notNull(),
  type: text('type', { enum: ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN'] }).notNull(),
  referenceId: text('reference_id'),
  referenceType: text('reference_type', { enum: ['SALE', 'PURCHASE', 'MANUAL'] }),
  notes: text('notes'),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type Inventory = typeof inventory.$inferSelect
export type NewInventory = typeof inventory.$inferInsert
export type InventoryMovement = typeof inventoryMovements.$inferSelect
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert
