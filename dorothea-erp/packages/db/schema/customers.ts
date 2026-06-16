import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text('name').notNull(),
  cuit: text('cuit'),
  fiscalCondition: text('fiscal_condition', {
    enum: ['RI', 'Monotributo', 'Exento', 'Consumidor Final'],
  })
    .notNull()
    .default('Consumidor Final'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  petsNotes: text('pets_notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
