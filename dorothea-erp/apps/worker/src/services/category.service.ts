import { eq } from 'drizzle-orm'
import { categories } from '@dorothea/db/schema'
import { NotFoundError } from '../utils/errors.ts'
import type { DbClient } from '../db/connection.ts'
import type { CreateCategoryInput, UpdateCategoryInput } from '@dorothea/validators/category'

export async function listCategories(db: DbClient) {
  return db.select().from(categories).orderBy(categories.name)
}

export async function createCategory(db: DbClient, input: CreateCategoryInput) {
  const [category] = await db
    .insert(categories)
    .values({ name: input.name, parentId: input.parentId ?? null })
    .returning()
  return category
}

export async function updateCategory(db: DbClient, id: string, input: UpdateCategoryInput) {
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!existing) throw new NotFoundError('Categoría no encontrada')

  const values: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.name !== undefined) values.name = input.name
  if (input.parentId !== undefined) values.parentId = input.parentId
  if (input.active !== undefined) values.active = input.active

  const [updated] = await db
    .update(categories)
    .set(values)
    .where(eq(categories.id, id))
    .returning()
  return updated
}

export async function deactivateCategory(db: DbClient, id: string) {
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!existing) throw new NotFoundError('Categoría no encontrada')

  await db
    .update(categories)
    .set({ active: false, updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id))
}
