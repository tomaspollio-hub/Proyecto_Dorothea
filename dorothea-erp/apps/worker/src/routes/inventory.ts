import { Hono } from 'hono'
import { listLowStock } from '../services/inventory.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const inventory = new Hono<{ Bindings: Env; Variables: Variables }>()

inventory.use('*', requireAuth())

inventory.get('/low-stock', async (c) => {
  const db = getDb(c.env)
  const data = await listLowStock(db)
  return c.json({ data })
})

export { inventory as inventoryRoutes }
