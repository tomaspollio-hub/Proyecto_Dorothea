import { eq, and, sql } from 'drizzle-orm'
import { cashRegisterSessions, cashMovements } from '@dorothea/db/schema'
import { NotFoundError, ConflictError } from '../utils/errors.ts'
import type { DbClient } from '../db/connection.ts'
import type {
  OpenSessionInput,
  CloseSessionInput,
  CreateMovementInput,
} from '@dorothea/validators/cash-register'

export async function getOpenSession(db: DbClient) {
  const [session] = await db
    .select()
    .from(cashRegisterSessions)
    .where(eq(cashRegisterSessions.status, 'OPEN'))
    .limit(1)
  return session ?? null
}

async function requireOpenSession(db: DbClient) {
  const session = await getOpenSession(db)
  if (!session) throw new NotFoundError('No hay una caja abierta')
  return session
}

export async function openSession(db: DbClient, input: OpenSessionInput, userId: number) {
  const existing = await getOpenSession(db)
  if (existing) throw new ConflictError('Ya hay una caja abierta')

  const [session] = await db
    .insert(cashRegisterSessions)
    .values({
      userId,
      openingAmountCents: input.openingAmountCents,
      notes: input.notes ?? null,
    })
    .returning()

  return session
}

export async function createMovement(db: DbClient, input: CreateMovementInput, userId: number) {
  const session = await requireOpenSession(db)

  const [movement] = await db
    .insert(cashMovements)
    .values({
      sessionId: session.id,
      type: input.type,
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      description: input.description,
      referenceType: 'MANUAL',
      userId,
    })
    .returning()

  return movement
}

export async function listSessionMovements(db: DbClient, sessionId: string) {
  return db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, sessionId))
    .orderBy(cashMovements.createdAt)
}

export async function getPaymentMethodSummary(db: DbClient, sessionId: string) {
  const rows = await db
    .select({
      paymentMethod: cashMovements.paymentMethod,
      type: cashMovements.type,
      total: sql<number>`sum(${cashMovements.amountCents})`,
    })
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, sessionId))
    .groupBy(cashMovements.paymentMethod, cashMovements.type)

  return rows
}

export async function closeSession(db: DbClient, input: CloseSessionInput) {
  const session = await requireOpenSession(db)

  const [cashTotals] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${cashMovements.type} = 'INCOME' then ${cashMovements.amountCents} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${cashMovements.type} = 'EXPENSE' then ${cashMovements.amountCents} else 0 end), 0)`,
    })
    .from(cashMovements)
    .where(and(eq(cashMovements.sessionId, session.id), eq(cashMovements.paymentMethod, 'CASH')))

  const expectedAmountCents = session.openingAmountCents + (cashTotals?.income ?? 0) - (cashTotals?.expense ?? 0)
  const differenceCents = input.closingAmountCents - expectedAmountCents

  const [updated] = await db
    .update(cashRegisterSessions)
    .set({
      closingAmountCents: input.closingAmountCents,
      expectedAmountCents,
      differenceCents,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      notes: input.notes ?? session.notes,
    })
    .where(eq(cashRegisterSessions.id, session.id))
    .returning()

  return updated
}

export async function listSessionHistory(db: DbClient, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(cashRegisterSessions)
      .orderBy(sql`${cashRegisterSessions.openedAt} desc`)
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(cashRegisterSessions),
  ])

  return { data: rows, total: countRows[0]?.count ?? 0, page, pageSize }
}

export async function getSessionById(db: DbClient, id: string) {
  const [session] = await db.select().from(cashRegisterSessions).where(eq(cashRegisterSessions.id, id)).limit(1)
  if (!session) throw new NotFoundError('Sesión de caja no encontrada')
  return session
}
