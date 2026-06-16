import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  createProductSchema,
  updateProductSchema,
  productSearchSchema,
} from '@dorothea/validators/product'
import { adjustStockSchema } from '@dorothea/validators/inventory'
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  softDeleteProduct,
  setProductImage,
} from '../services/product.service.ts'
import { adjustStock, listMovements } from '../services/inventory.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getDb } from '../db/connection.ts'
import { ValidationError, NotFoundError } from '../utils/errors.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

const products = new Hono<{ Bindings: Env; Variables: Variables }>()

products.use('*', requireAuth())

products.get('/', zValidator('query', productSearchSchema), async (c) => {
  const params = c.req.valid('query')
  const db = getDb(c.env)
  const result = await listProducts(db, params)
  return c.json({ data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } })
})

products.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  const data = await getProductById(db, id)
  return c.json({ data })
})

products.post('/', zValidator('json', createProductSchema), async (c) => {
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await createProduct(db, input)
  return c.json({ data }, 201)
})

products.patch('/:id', zValidator('json', updateProductSchema), async (c) => {
  const id = c.req.param('id')
  const input = c.req.valid('json')
  const db = getDb(c.env)
  const data = await updateProduct(db, id, input)
  return c.json({ data })
})

products.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await softDeleteProduct(db, id)
  return c.json({ data: { ok: true } })
})

products.post('/:id/image', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)

  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) {
    throw new ValidationError('Se requiere un archivo de imagen')
  }
  if (!file.type.startsWith('image/')) {
    throw new ValidationError('El archivo debe ser una imagen')
  }

  const extension = file.name.split('.').pop() ?? 'jpg'
  const key = `products/${id}.${extension}`

  await c.env.STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  const data = await setProductImage(db, id, key)
  return c.json({ data })
})

products.get('/:id/image', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  const product = await getProductById(db, id)
  if (!product.imageR2Key) throw new NotFoundError('El producto no tiene imagen')

  const object = await c.env.STORAGE.get(product.imageR2Key)
  if (!object) throw new NotFoundError('Imagen no encontrada')

  return new Response(object.body, {
    headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' },
  })
})

products.get('/:id/movements', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  const data = await listMovements(db, id)
  return c.json({ data })
})

products.post('/:id/stock', zValidator('json', adjustStockSchema), async (c) => {
  const id = c.req.param('id')
  const input = c.req.valid('json')
  const user = c.get('user')
  const db = getDb(c.env)
  const data = await adjustStock(db, id, input, Number(user.sub))
  return c.json({ data })
})

export { products as productRoutes }
