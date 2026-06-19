import { eq, and, sql } from 'drizzle-orm'
import { sales, saleItems, products, inventory, cashRegisterSessions, cashMovements } from '@dorothea/db/schema'
import type { DbClient } from '../db/connection.ts'

export async function getDashboardData(db: DbClient) {
  const [todayStats] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(case when ${sales.status} = 'COMPLETED' then ${sales.totalCents} else 0 end), 0)`,
      count: sql<number>`coalesce(sum(case when ${sales.status} = 'COMPLETED' then 1 else 0 end), 0)`,
    })
    .from(sales)
    .where(sql`date(${sales.createdAt}) = date('now')`)

  const todayTotal = Number(todayStats?.totalCents ?? 0)
  const todayCount = Number(todayStats?.count ?? 0)
  const avgTicketCents = todayCount > 0 ? Math.round(todayTotal / todayCount) : 0

  const salesLast7Days = await db
    .select({
      day: sql<string>`date(${sales.createdAt})`,
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(and(eq(sales.status, 'COMPLETED'), sql`${sales.createdAt} >= date('now', '-6 days')`))
    .groupBy(sql`date(${sales.createdAt})`)
    .orderBy(sql`date(${sales.createdAt})`)

  const topProducts = await db
    .select({
      productName: saleItems.productName,
      totalQuantity: sql<number>`sum(${saleItems.quantity})`,
      totalCents: sql<number>`sum(${saleItems.subtotalCents})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .where(and(eq(sales.status, 'COMPLETED'), sql`${sales.createdAt} >= date('now', '-29 days')`))
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(sql`sum(${saleItems.quantity}) desc`)
    .limit(5)

  const lowStock = await db
    .select({
      id: products.id,
      name: products.name,
      minStock: products.minStock,
      quantity: inventory.quantity,
    })
    .from(products)
    .innerJoin(inventory, eq(inventory.productId, products.id))
    .where(and(eq(products.active, true), sql`${inventory.quantity} <= ${products.minStock}`))
    .orderBy(inventory.quantity)
    .limit(10)

  const [openSession] = await db
    .select()
    .from(cashRegisterSessions)
    .where(eq(cashRegisterSessions.status, 'OPEN'))
    .limit(1)

  let estimatedCashCents: number | null = null
  if (openSession) {
    const [cashTotals] = await db
      .select({
        income: sql<number>`coalesce(sum(case when ${cashMovements.type} = 'INCOME' then ${cashMovements.amountCents} else 0 end), 0)`,
        expense: sql<number>`coalesce(sum(case when ${cashMovements.type} = 'EXPENSE' then ${cashMovements.amountCents} else 0 end), 0)`,
      })
      .from(cashMovements)
      .where(and(eq(cashMovements.sessionId, openSession.id), eq(cashMovements.paymentMethod, 'CASH')))
    estimatedCashCents =
      openSession.openingAmountCents + Number(cashTotals?.income ?? 0) - Number(cashTotals?.expense ?? 0)
  }

  return {
    today: { totalCents: todayTotal, count: todayCount, avgTicketCents },
    salesLast7Days: salesLast7Days.map((r) => ({
      day: r.day,
      totalCents: Number(r.totalCents),
      count: Number(r.count),
    })),
    topProducts: topProducts.map((r) => ({
      productName: r.productName,
      totalQuantity: Number(r.totalQuantity),
      totalCents: Number(r.totalCents),
    })),
    lowStock,
    cashRegister: openSession
      ? { status: 'OPEN' as const, openedAt: openSession.openedAt, estimatedCashCents }
      : { status: 'CLOSED' as const, openedAt: null, estimatedCashCents: null },
  }
}
