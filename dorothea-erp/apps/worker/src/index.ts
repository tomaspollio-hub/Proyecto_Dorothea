import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { corsMiddleware } from './middleware/cors.ts'
import { authRoutes } from './routes/auth.ts'
import { AppError } from './utils/errors.ts'
import type { Env } from './env.ts'

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', corsMiddleware())

app.get('/', (c) =>
  c.json({
    app: 'Dorothea ERP Worker',
    version: '0.1.0',
    env: c.env.APP_ENV,
  }),
)

app.route('/api/v1/auth', authRoutes)

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as 400 | 401 | 403 | 404 | 422 | 500)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' }, 500)
})

app.notFound((c) => c.json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' }, 404))

export default app
