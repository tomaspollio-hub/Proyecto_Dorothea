import { cors } from 'hono/cors'
import type { Env } from '../env.ts'
import type { MiddlewareHandler } from 'hono'

export function corsMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return cors({
    origin: (origin, c) => {
      const env = c.env.APP_ENV
      if (env === 'development') return origin
      const allowed = [
        'https://dorothea-erp.pages.dev',
        'https://erp.dorotheapetshop.com.ar',
      ]
      return allowed.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    credentials: true,
  })
}
