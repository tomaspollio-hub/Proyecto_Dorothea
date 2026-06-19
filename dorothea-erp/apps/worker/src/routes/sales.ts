import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createSaleSchema, saleSearchSchema, returnSaleItemsSchema } from '@dorothea/validators/sale'
import { createSale, getSaleById, listSales, cancelSale, returnSaleItems } from '../services/sale.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const sales = new Hono<{ Bindings: Env; Variables: Variables }>()

sales.use('*', requireAuth())

sales.get('/', zValidator('query', saleSearchSchema), async (c) => {
  const params = c.req.valid('query')
  const db = getDb(c.env)
  const result = await listSales(db, params)
  return c.json({ data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } })
})

sales.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  const data = await getSaleById(db, id)
  return c.json({ data })
})

sales.post('/', zValidator('json', createSaleSchema), async (c) => {
  const input = c.req.valid('json')
  const user = c.get('user')
  const db = getDb(c.env)
  const data = await createSale(db, input, Number(user.sub))
  return c.json({ data }, 201)
})

sales.post('/:id/cancel', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const db = getDb(c.env)
  const data = await cancelSale(db, id, Number(user.sub))
  return c.json({ data })
})

sales.post('/:id/return', zValidator('json', returnSaleItemsSchema), async (c) => {
  const id = c.req.param('id')
  const input = c.req.valid('json')
  const user = c.get('user')
  const db = getDb(c.env)
  const data = await returnSaleItems(db, id, input, Number(user.sub))
  return c.json({ data })
})

export { sales as saleRoutes }
