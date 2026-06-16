import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '@dorothea/validators/user'
import { listUsers, createUser, updateUser, adminResetPassword } from '../services/user.service.ts'
import { requireAuth, requireRole } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const userRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

userRoutes.use('*', requireAuth(), requireRole('admin'))

userRoutes.get('/', async (c) => {
  const db = getDb(c.env)
  const data = await listUsers(db)
  return c.json({ data })
})

userRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await createUser(db, input)
  return c.json({ data }, 201)
})

userRoutes.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = Number(c.req.param('id'))
  const input = c.req.valid('json')
  const currentUser = c.get('user')
  const db = getDb(c.env)
  const data = await updateUser(db, id, input, Number(currentUser.sub))
  return c.json({ data })
})

userRoutes.post('/:id/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const id = Number(c.req.param('id'))
  const { newPassword } = c.req.valid('json')
  const db = getDb(c.env)
  await adminResetPassword(db, id, newPassword)
  return c.json({ data: { ok: true } })
})

export { userRoutes }
