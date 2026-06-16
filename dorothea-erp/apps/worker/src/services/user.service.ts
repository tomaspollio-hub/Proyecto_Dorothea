import { eq } from 'drizzle-orm'
import { users, sessions } from '@dorothea/db/schema'
import { hashPassword } from '../utils/crypto.ts'
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.ts'
import type { DbClient } from '../db/connection.ts'
import type { CreateUserInput, UpdateUserInput } from '@dorothea/validators/user'

export async function listUsers(db: DbClient) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name)
  return rows
}

export async function createUser(db: DbClient, input: CreateUserInput) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1)
  if (existing) throw new ConflictError(`Ya existe un usuario con email ${input.email}`)

  const passwordHash = await hashPassword(input.password)
  const [user] = await db
    .insert(users)
    .values({ email: input.email, passwordHash, name: input.name, role: input.role })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive })

  if (!user) throw new ConflictError('No se pudo crear el usuario')
  return user
}

export async function updateUser(db: DbClient, id: number, input: UpdateUserInput, currentUserId: number) {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!existing) throw new NotFoundError('Usuario no encontrado')

  if (id === currentUserId && input.isActive === false) {
    throw new ValidationError('No podés desactivar tu propio usuario')
  }
  if (id === currentUserId && input.role && input.role !== 'admin') {
    throw new ValidationError('No podés quitarte el rol admin a vos mismo')
  }

  const values: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.name !== undefined) values.name = input.name
  if (input.role !== undefined) values.role = input.role
  if (input.isActive !== undefined) values.isActive = input.isActive

  const [updated] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive })

  if (input.isActive === false) {
    await db.delete(sessions).where(eq(sessions.userId, id))
  }

  return updated
}

export async function adminResetPassword(db: DbClient, id: number, newPassword: string) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
  if (!existing) throw new NotFoundError('Usuario no encontrado')

  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, id))
  await db.delete(sessions).where(eq(sessions.userId, id))
}
