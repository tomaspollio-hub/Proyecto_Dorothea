import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users.ts'

export const cashRegisterSessions = sqliteTable('cash_register_sessions', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: integer('user_id').notNull().references(() => users.id),
  openingAmountCents: integer('opening_amount_cents').notNull(),
  closingAmountCents: integer('closing_amount_cents'),
  expectedAmountCents: integer('expected_amount_cents'),
  differenceCents: integer('difference_cents'),
  status: text('status', { enum: ['OPEN', 'CLOSED'] }).notNull().default('OPEN'),
  openedAt: text('opened_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  closedAt: text('closed_at'),
  notes: text('notes'),
})

export const cashMovements = sqliteTable('cash_movements', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  sessionId: text('session_id').notNull().references(() => cashRegisterSessions.id),
  type: text('type', { enum: ['INCOME', 'EXPENSE'] }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  paymentMethod: text('payment_method', {
    enum: ['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QR'],
  }).notNull(),
  description: text('description').notNull(),
  referenceId: text('reference_id'),
  referenceType: text('reference_type', { enum: ['SALE', 'MANUAL'] }).notNull().default('MANUAL'),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type CashRegisterSession = typeof cashRegisterSessions.$inferSelect
export type NewCashRegisterSession = typeof cashRegisterSessions.$inferInsert
export type CashMovement = typeof cashMovements.$inferSelect
export type NewCashMovement = typeof cashMovements.$inferInsert
