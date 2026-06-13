import type { MiddlewareHandler } from 'hono'
import { verifyJwt } from '../utils/crypto.ts'
import { UnauthorizedError } from '../utils/errors.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload, UserRole } from '@dorothea/shared/types'

type AuthVariables = {
  user: AuthTokenPayload
}

export function requireAuth(): MiddlewareHandler<{ Bindings: Env; Variables: AuthVariables }> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token requerido')
    }

    const token = authHeader.slice(7)
    try {
      const payload = await verifyJwt<AuthTokenPayload>(token, c.env.JWT_SECRET)
      c.set('user', payload)
      await next()
    } catch {
      throw new UnauthorizedError('Token inválido o expirado')
    }
  }
}

export function requireRole(...roles: UserRole[]): MiddlewareHandler<{ Bindings: Env; Variables: AuthVariables }> {
  return async (c, next) => {
    const user = c.get('user')
    if (!roles.includes(user.role)) {
      throw new UnauthorizedError('No tenés permisos para esta acción')
    }
    await next()
  }
}
