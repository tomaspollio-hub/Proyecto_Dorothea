import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { corsMiddleware } from './middleware/cors.ts'
import { authRoutes } from './routes/auth.ts'
import { categoryRoutes } from './routes/categories.ts'
import { productRoutes } from './routes/products.ts'
import { inventoryRoutes } from './routes/inventory.ts'
import { customerRoutes } from './routes/customers.ts'
import { cashRegisterRoutes } from './routes/cash-register.ts'
import { saleRoutes } from './routes/sales.ts'
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
app.route('/api/v1/categories', categoryRoutes)
app.route('/api/v1/products', productRoutes)
app.route('/api/v1/inventory', inventoryRoutes)
app.route('/api/v1/customers', customerRoutes)
app.route('/api/v1/cash-register', cashRegisterRoutes)
app.route('/api/v1/sales', saleRoutes)

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' }, 500)
})

app.notFound((c) => c.json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' }, 404))

export default app
