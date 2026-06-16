import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { loginSchema, refreshSchema } from '@dorothea/validators/auth'
import { loginUser, refreshUserToken, logoutUser, createInitialAdmin } from '../services/auth.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const auth = new Hono<{ Bindings: Env; Variables: Variables }>()

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const db = getDb(c.env)

  const result = await loginUser(db, email, password, c.env.JWT_SECRET)
  return c.json(result)
})

auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')
  const db = getDb(c.env)

  const result = await refreshUserToken(db, refreshToken, c.env.JWT_SECRET)
  return c.json(result)
})

auth.post('/logout', requireAuth(), async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>().catch(() => ({ refreshToken: undefined }))
  if (body.refreshToken) {
    const db = getDb(c.env)
    await logoutUser(db, body.refreshToken)
  }
  return c.json({ ok: true })
})

auth.get('/me', requireAuth(), (c) => {
  const user = c.get('user')
  return c.json({
    id: user.sub,
    email: user.email,
    name: user.name,
    role: user.role,
  })
})

// Solo disponible en development para crear el admin inicial
auth.post('/seed', async (c) => {
  if (c.env.APP_ENV !== 'development') {
    return c.json({ error: 'No disponible', code: 'FORBIDDEN' }, 403)
  }
  const body = await c.req.json<{ email: string; password: string; name: string }>()
  const db = getDb(c.env)
  await createInitialAdmin(db, body.email, body.password, body.name)
  return c.json({ ok: true, message: 'Usuario admin creado' })
})

export { auth as authRoutes }
