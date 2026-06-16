import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createCategorySchema, updateCategorySchema } from '@dorothea/validators/category'
import { listCategories, createCategory, updateCategory, deactivateCategory } from '../services/category.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const categories = new Hono<{ Bindings: Env; Variables: Variables }>()

categories.use('*', requireAuth())

categories.get('/', async (c) => {
  const db = getDb(c.env)
  const data = await listCategories(db)
  return c.json({ data })
})

categories.post('/', zValidator('json', createCategorySchema), async (c) => {
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await createCategory(db, input)
  return c.json({ data }, 201)
})

categories.patch('/:id', zValidator('json', updateCategorySchema), async (c) => {
  const id = c.req.param('id')
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await updateCategory(db, id, input)
  return c.json({ data })
})

categories.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await deactivateCategory(db, id)
  return c.json({ data: { ok: true } })
})

export { categories as categoryRoutes }
