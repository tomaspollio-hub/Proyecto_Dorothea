import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@dorothea/db/schema'
import { users, products, inventory, ivaRates } from '@dorothea/db/schema'

export function testDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export async function seedUser(db: ReturnType<typeof testDb>) {
  const [user] = await db
    .insert(users)
    .values({ email: `test-${Date.now()}@dorothea.com.ar`, passwordHash: 'x', name: 'Test User', role: 'admin' })
    .returning()
  if (!user) throw new Error('No se pudo crear el usuario de prueba')
  return user
}

export async function seedProduct(
  db: ReturnType<typeof testDb>,
  overrides: { priceCents?: number; stock?: number; ivaRate?: number } = {},
) {
  let ivaRateId: string | null = null
  if (overrides.ivaRate !== undefined) {
    const [rate] = await db
      .insert(ivaRates)
      .values({ name: `${overrides.ivaRate}`, rate: overrides.ivaRate })
      .returning()
    ivaRateId = rate?.id ?? null
  }

  const [product] = await db
    .insert(products)
    .values({
      code: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: 'Producto de prueba',
      priceCents: overrides.priceCents ?? 100000,
      ivaRateId,
      unit: 'unidad',
      minStock: 0,
    })
    .returning()
  if (!product) throw new Error('No se pudo crear el producto de prueba')

  await db.insert(inventory).values({ productId: product.id, quantity: overrides.stock ?? 10 })

  return product
}
