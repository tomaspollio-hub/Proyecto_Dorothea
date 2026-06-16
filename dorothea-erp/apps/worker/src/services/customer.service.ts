import { eq, and, or, like, isNull, sql } from 'drizzle-orm'
import { customers } from '@dorothea/db/schema'
import { NotFoundError, ConflictError } from '../utils/errors.ts'
import type { DbClient } from '../db/connection.ts'
import type { CreateCustomerInput, UpdateCustomerInput, CustomerSearchInput } from '@dorothea/validators/customer'

export async function listCustomers(db: DbClient, params: CustomerSearchInput) {
  const conditions = [isNull(customers.deletedAt)]

  if (params.search) {
    const term = `%${params.search}%`
    conditions.push(
      or(like(customers.name, term), like(customers.cuit, term), like(customers.phone, term))!,
    )
  }
  if (params.active !== undefined) {
    conditions.push(eq(customers.active, params.active))
  }

  const where = and(...conditions)
  const offset = (params.page - 1) * params.pageSize

  const [rows, countRows] = await Promise.all([
    db.select().from(customers).where(where).orderBy(customers.name).limit(params.pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(where),
  ])

  return { data: rows, total: countRows[0]?.count ?? 0, page: params.page, pageSize: params.pageSize }
}

export async function getCustomerById(db: DbClient, id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt)))
    .limit(1)
  if (!customer) throw new NotFoundError('Cliente no encontrado')
  return customer
}

export async function createCustomer(db: DbClient, input: CreateCustomerInput) {
  if (input.cuit) {
    const [existing] = await db.select().from(customers).where(eq(customers.cuit, input.cuit)).limit(1)
    if (existing) throw new ConflictError(`Ya existe un cliente con CUIT ${input.cuit}`)
  }

  const [customer] = await db
    .insert(customers)
    .values({
      name: input.name,
      cuit: input.cuit || null,
      fiscalCondition: input.fiscalCondition ?? 'Consumidor Final',
      email: input.email || null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      petsNotes: input.petsNotes ?? null,
    })
    .returning()

  if (!customer) throw new ConflictError('No se pudo crear el cliente')
  return customer
}

export async function updateCustomer(db: DbClient, id: string, input: UpdateCustomerInput) {
  const existing = await getCustomerById(db, id)

  if (input.cuit && input.cuit !== existing.cuit) {
    const [cuitTaken] = await db.select().from(customers).where(eq(customers.cuit, input.cuit)).limit(1)
    if (cuitTaken) throw new ConflictError(`Ya existe un cliente con CUIT ${input.cuit}`)
  }

  const values: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) values[key] = value === '' ? null : value
  }

  const [updated] = await db.update(customers).set(values).where(eq(customers.id, id)).returning()
  return updated
}

export async function softDeleteCustomer(db: DbClient, id: string) {
  await getCustomerById(db, id)

  await db
    .update(customers)
    .set({ active: false, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(customers.id, id))
}
