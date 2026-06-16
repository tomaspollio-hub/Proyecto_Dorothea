import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerSearchSchema,
} from '@dorothea/validators/customer'
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  softDeleteCustomer,
} from '../services/customer.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const customers = new Hono<{ Bindings: Env; Variables: Variables }>()

customers.use('*', requireAuth())

customers.get('/', zValidator('query', customerSearchSchema), async (c) => {
  const params = c.req.valid('query')
  const db = getDb(c.env)
  const result = await listCustomers(db, params)
  return c.json({ data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } })
})

customers.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  const data = await getCustomerById(db, id)
  return c.json({ data })
})

customers.post('/', zValidator('json', createCustomerSchema), async (c) => {
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await createCustomer(db, input)
  return c.json({ data }, 201)
})

customers.patch('/:id', zValidator('json', updateCustomerSchema), async (c) => {
  const id = c.req.param('id')
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await updateCustomer(db, id, input)
  return c.json({ data })
})

customers.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await softDeleteCustomer(db, id)
  return c.json({ data: { ok: true } })
})

export { customers as customerRoutes }
