import { eq, and, sql } from 'drizzle-orm'
import { sales, saleItems } from '@dorothea/db/schema'
import type { DbClient } from '../db/connection.ts'

export async function getSalesReport(db: DbClient, from: string, to: string) {
  const [summaryRow] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
      count: sql<number>`coalesce(count(*), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.status, 'COMPLETED'),
        sql`date(${sales.createdAt}) >= ${from}`,
        sql`date(${sales.createdAt}) <= ${to}`,
      ),
    )

  const totalCents = Number(summaryRow?.totalCents ?? 0)
  const count = Number(summaryRow?.count ?? 0)
  const avgTicketCents = count > 0 ? Math.round(totalCents / count) : 0

  const byDay = await db
    .select({
      day: sql<string>`date(${sales.createdAt})`,
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.status, 'COMPLETED'),
        sql`date(${sales.createdAt}) >= ${from}`,
        sql`date(${sales.createdAt}) <= ${to}`,
      ),
    )
    .groupBy(sql`date(${sales.createdAt})`)
    .orderBy(sql`date(${sales.createdAt}) asc`)

  const byPaymentMethod = await db
    .select({
      paymentMethod: sales.paymentMethod,
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.status, 'COMPLETED'),
        sql`date(${sales.createdAt}) >= ${from}`,
        sql`date(${sales.createdAt}) <= ${to}`,
      ),
    )
    .groupBy(sales.paymentMethod)
    .orderBy(sql`sum(${sales.totalCents}) desc`)

  const topProducts = await db
    .select({
      productName: saleItems.productName,
      totalQuantity: sql<number>`sum(${saleItems.quantity})`,
      totalCents: sql<number>`sum(${saleItems.subtotalCents})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .where(
      and(
        eq(sales.status, 'COMPLETED'),
        sql`date(${sales.createdAt}) >= ${from}`,
        sql`date(${sales.createdAt}) <= ${to}`,
      ),
    )
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(sql`sum(${saleItems.quantity}) desc`)
    .limit(10)

  return {
    summary: { totalCents, count, avgTicketCents },
    byDay: byDay.map((r) => ({
      day: r.day,
      totalCents: Number(r.totalCents),
      count: Number(r.count),
    })),
    byPaymentMethod: byPaymentMethod.map((r) => ({
      paymentMethod: r.paymentMethod ?? 'UNKNOWN',
      totalCents: Number(r.totalCents),
      count: Number(r.count),
    })),
    topProducts: topProducts.map((r) => ({
      productName: r.productName,
      totalQuantity: Number(r.totalQuantity),
      totalCents: Number(r.totalCents),
    })),
  }
}
