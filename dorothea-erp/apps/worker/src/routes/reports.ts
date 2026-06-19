import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import { getSalesReport } from '../services/report.service.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const reports = new Hono<{ Bindings: Env; Variables: Variables }>()

reports.use('*', requireAuth())

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

reports.get('/sales', async (c) => {
  const rawFrom = c.req.query('from')
  const rawTo = c.req.query('to')

  // Default to current month if not provided
  const today = new Date()
  const defaultFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = today.toISOString().slice(0, 10)

  const fromResult = dateSchema.safeParse(rawFrom)
  const toResult = dateSchema.safeParse(rawTo)

  const from = fromResult.success ? fromResult.data : defaultFrom
  const to = toResult.success ? toResult.data : defaultTo

  const db = getDb(c.env)
  const data = await getSalesReport(db, from, to)
  return c.json({ data })
})

export { reports as reportRoutes }
