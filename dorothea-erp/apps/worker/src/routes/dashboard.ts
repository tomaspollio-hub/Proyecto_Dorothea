import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import { getDashboardData } from '../services/dashboard.service.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const dashboard = new Hono<{ Bindings: Env; Variables: Variables }>()

dashboard.use('*', requireAuth())

dashboard.get('/', async (c) => {
  const db = getDb(c.env)
  const data = await getDashboardData(db)
  return c.json({ data })
})

export { dashboard as dashboardRoutes }
