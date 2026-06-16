import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { categories } from './categories.ts'
import { ivaRates } from './iva-rates.ts'

export const products = sqliteTable('products', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  costCents: integer('cost_cents'),
  categoryId: text('category_id').references(() => categories.id),
  ivaRateId: text('iva_rate_id').references(() => ivaRates.id),
  supplierId: text('supplier_id'), // FK se agrega cuando exista el módulo de proveedores (Fase 2)
  unit: text('unit', { enum: ['unidad', 'kg', 'litro'] }).notNull().default('unidad'),
  minStock: integer('min_stock').notNull().default(0),
  imageR2Key: text('image_r2_key'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
})

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
