import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { customers } from './customers.ts'
import { users } from './users.ts'
import { cashRegisterSessions } from './cash-register.ts'
import { products } from './products.ts'

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  customerId: text('customer_id').references(() => customers.id),
  userId: integer('user_id').notNull().references(() => users.id),
  cashRegisterSessionId: text('cash_register_session_id').notNull().references(() => cashRegisterSessions.id),
  subtotalCents: integer('subtotal_cents').notNull(),
  discountCents: integer('discount_cents').notNull().default(0),
  totalIvaCents: integer('total_iva_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
  paymentMethod: text('payment_method', {
    enum: ['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QR'],
  }).notNull(),
  amountPaidCents: integer('amount_paid_cents').notNull(),
  changeCents: integer('change_cents').notNull().default(0),
  status: text('status', { enum: ['COMPLETED', 'CANCELLED', 'PENDING_INVOICE'] })
    .notNull()
    .default('COMPLETED'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  saleId: text('sale_id').notNull().references(() => sales.id),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  discountCents: integer('discount_cents').notNull().default(0),
  ivaRate: integer('iva_rate').notNull(),
  ivaAmountCents: integer('iva_amount_cents').notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
})

export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert
export type SaleItem = typeof saleItems.$inferSelect
export type NewSaleItem = typeof saleItems.$inferInsert
