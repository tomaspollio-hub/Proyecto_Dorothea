import { eq } from 'drizzle-orm'
import { users, sessions } from '@dorothea/db/schema'
import { hashPassword, verifyPassword, signJwt, generateRefreshToken } from '../utils/crypto.ts'
import { UnauthorizedError } from '../utils/errors.ts'
import { JWT_EXPIRY_SECONDS, REFRESH_EXPIRY_DAYS } from '@dorothea/shared/constants'
import type { DbClient } from '../db/connection.ts'
import type { LoginResponse, RefreshResponse, AuthTokenPayload } from '@dorothea/shared/types'

export async function loginUser(
  db: DbClient,
  email: string,
  password: string,
  jwtSecret: string,
): Promise<LoginResponse> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Credenciales inválidas')
  }

  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    throw new UnauthorizedError('Credenciales inválidas')
  }

  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }

  const token = await signJwt(payload, jwtSecret, JWT_EXPIRY_SECONDS)
  const refreshToken = generateRefreshToken()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS)

  await db.insert(sessions).values({
    userId: user.id,
    refreshToken,
    expiresAt: expiresAt.toISOString(),
  })

  return {
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }
}

export async function refreshUserToken(
  db: DbClient,
  refreshToken: string,
  jwtSecret: string,
): Promise<RefreshResponse> {
  const [session] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.refreshToken, refreshToken))
    .limit(1)

  if (!session) {
    throw new UnauthorizedError('Refresh token inválido')
  }

  if (new Date(session.session.expiresAt) < new Date()) {
    await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken))
    throw new UnauthorizedError('Refresh token expirado')
  }

  if (!session.user.isActive) {
    throw new UnauthorizedError('Usuario inactivo')
  }

  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  }

  const token = await signJwt(payload, jwtSecret, JWT_EXPIRY_SECONDS)
  return { token }
}

export async function logoutUser(db: DbClient, refreshToken: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken))
}

export async function createInitialAdmin(
  db: DbClient,
  email: string,
  password: string,
  name: string,
): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).limit(1)
  if (existing) {
    throw new UnauthorizedError('Ya existen usuarios; el seed inicial solo se permite en una base vacía')
  }

  const passwordHash = await hashPassword(password)
  await db.insert(users).values({ email, passwordHash, name, role: 'admin' })
}

export async function changePassword(
  db: DbClient,
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new UnauthorizedError('Usuario no encontrado')

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Contraseña actual incorrecta')

  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))

  // Invalida todas las sesiones existentes (refresh tokens) para forzar reautenticación
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
