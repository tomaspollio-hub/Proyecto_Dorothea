import { eq, and, or, like, isNull, sql } from 'drizzle-orm'
import { products, categories, ivaRates, inventory } from '@dorothea/db/schema'
import { NotFoundError, ConflictError } from '../utils/errors.ts'
import type { DbClient } from '../db/connection.ts'
import type { CreateProductInput, UpdateProductInput, ProductSearchInput } from '@dorothea/validators/product'

const productWithJoins = {
  id: products.id,
  code: products.code,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  costCents: products.costCents,
  categoryId: products.categoryId,
  categoryName: categories.name,
  ivaRateId: products.ivaRateId,
  ivaRateName: ivaRates.name,
  ivaRate: ivaRates.rate,
  unit: products.unit,
  minStock: products.minStock,
  imageR2Key: products.imageR2Key,
  active: products.active,
  quantity: inventory.quantity,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
}

function baseProductQuery(db: DbClient) {
  return db
    .select(productWithJoins)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(ivaRates, eq(products.ivaRateId, ivaRates.id))
    .leftJoin(inventory, eq(inventory.productId, products.id))
}

export async function listProducts(db: DbClient, params: ProductSearchInput) {
  const conditions = [isNull(products.deletedAt)]

  if (params.search) {
    const term = `%${params.search}%`
    conditions.push(or(like(products.name, term), like(products.code, term))!)
  }
  if (params.categoryId) {
    conditions.push(eq(products.categoryId, params.categoryId))
  }
  if (params.active !== undefined) {
    conditions.push(eq(products.active, params.active))
  }

  const where = and(...conditions)
  const offset = (params.page - 1) * params.pageSize

  const [rows, countRows] = await Promise.all([
    baseProductQuery(db).where(where).limit(params.pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(where),
  ])

  return { data: rows, total: countRows[0]?.count ?? 0, page: params.page, pageSize: params.pageSize }
}

export async function getProductById(db: DbClient, id: string) {
  const [product] = await baseProductQuery(db).where(
    and(eq(products.id, id), isNull(products.deletedAt)),
  )
  if (!product) throw new NotFoundError('Producto no encontrado')
  return product
}

export async function createProduct(db: DbClient, input: CreateProductInput) {
  const [existing] = await db.select().from(products).where(eq(products.code, input.code)).limit(1)
  if (existing) throw new ConflictError(`Ya existe un producto con código ${input.code}`)

  const [product] = await db
    .insert(products)
    .values({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      priceCents: input.priceCents,
      costCents: input.costCents ?? null,
      categoryId: input.categoryId ?? null,
      ivaRateId: input.ivaRateId ?? null,
      unit: input.unit,
      minStock: input.minStock,
    })
    .returning()

  if (!product) throw new ConflictError('No se pudo crear el producto')

  await db.insert(inventory).values({ productId: product.id, quantity: input.initialStock })

  return getProductById(db, product.id)
}

export async function updateProduct(db: DbClient, id: string, input: UpdateProductInput) {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1)
  if (!existing) throw new NotFoundError('Producto no encontrado')

  if (input.code && input.code !== existing.code) {
    const [codeTaken] = await db.select().from(products).where(eq(products.code, input.code)).limit(1)
    if (codeTaken) throw new ConflictError(`Ya existe un producto con código ${input.code}`)
  }

  const values: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) values[key] = value
  }

  await db
    .update(products)
    .set(values)
    .where(eq(products.id, id))

  return getProductById(db, id)
}

export async function softDeleteProduct(db: DbClient, id: string) {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1)
  if (!existing) throw new NotFoundError('Producto no encontrado')

  await db
    .update(products)
    .set({ active: false, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(products.id, id))
}

export async function setProductImage(db: DbClient, id: string, imageR2Key: string) {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1)
  if (!existing) throw new NotFoundError('Producto no encontrado')

  await db
    .update(products)
    .set({ imageR2Key, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id))

  return getProductById(db, id)
}
