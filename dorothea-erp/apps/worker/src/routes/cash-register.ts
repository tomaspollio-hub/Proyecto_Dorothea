import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { openSessionSchema, closeSessionSchema, createMovementSchema } from '@dorothea/validators/cash-register'
import {
  getOpenSession,
  openSession,
  createMovement,
  listSessionMovements,
  getPaymentMethodSummary,
  closeSession,
  listSessionHistory,
  getSessionById,
} from '../services/cash-register.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const cashRegister = new Hono<{ Bindings: Env; Variables: Variables }>()

cashRegister.use('*', requireAuth())

cashRegister.get('/current', async (c) => {
  const db = getDb(c.env)
  const session = await getOpenSession(db)
  if (!session) return c.json({ data: null })

  const [movements, summary] = await Promise.all([
    listSessionMovements(db, session.id),
    getPaymentMethodSummary(db, session.id),
  ])

  return c.json({ data: { session, movements, summary } })
})

cashRegister.post('/open', zValidator('json', openSessionSchema), async (c) => {
  const input = c.req.valid('json')
  const user = c.get('user')
  const db = getDb(c.env)
  const data = await openSession(db, input, Number(user.sub))
  return c.json({ data }, 201)
})

cashRegister.post('/movements', zValidator('json', createMovementSchema), async (c) => {
  const input = c.req.valid('json')
  const user = c.get('user')
  const db = getDb(c.env)
  const data = await createMovement(db, input, Number(user.sub))
  return c.json({ data }, 201)
})

cashRegister.post('/close', zValidator('json', closeSessionSchema), async (c) => {
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await closeSession(db, input)
  return c.json({ data })
})

cashRegister.get('/history', zValidator('query', z.object({ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().positive().max(100).default(20) })), async (c) => {
  const { page, pageSize } = c.req.valid('query')
  const db = getDb(c.env)
  const result = await listSessionHistory(db, page, pageSize)
  return c.json({ data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } })
})

cashRegister.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  const session = await getSessionById(db, id)
  const [movements, summary] = await Promise.all([
    listSessionMovements(db, session.id),
    getPaymentMethodSummary(db, session.id),
  ])
  return c.json({ data: { session, movements, summary } })
})

export { cashRegister as cashRegisterRoutes }
