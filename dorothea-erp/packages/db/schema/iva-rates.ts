import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// rate en centésimas de punto porcentual: 2100 = 21.00%, 1050 = 10.50%, 0 = 0%
export const ivaRates = sqliteTable('iva_rates', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text('name').notNull(),
  rate: integer('rate').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
})

export type IvaRate = typeof ivaRates.$inferSelect
export type NewIvaRate = typeof ivaRates.$inferInsert
