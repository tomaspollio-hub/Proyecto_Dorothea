import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { arcaConfigSchema, mercadoPagoConfigSchema } from '@dorothea/validators/integrations'
import {
  getArcaConfigStatus,
  setArcaConfig,
  getMercadoPagoConfigStatus,
  setMercadoPagoConfig,
} from '../services/integration-config.service.ts'
import { requireAuth, requireRole } from '../middleware/auth.ts'
import type { Env } from '../env.ts'
import type { AuthTokenPayload } from '@dorothea/shared/types'

type Variables = { user: AuthTokenPayload }

// Nota: el binding KV se llama ARCA_CONFIG por historia (Fase 0), pero se usa
// como almacén genérico de configuración de integraciones externas (ARCA y
// Mercado Pago por ahora), separadas por prefijo de clave.

const integrations = new Hono<{ Bindings: Env; Variables: Variables }>()

integrations.use('*', requireAuth(), requireRole('admin'))

integrations.get('/arca', async (c) => {
  const data = await getArcaConfigStatus(c.env.ARCA_CONFIG)
  return c.json({ data })
})

integrations.put('/arca', zValidator('json', arcaConfigSchema), async (c) => {
  const input = c.req.valid('json')
  await setArcaConfig(c.env.ARCA_CONFIG, input)
  const data = await getArcaConfigStatus(c.env.ARCA_CONFIG)
  return c.json({ data })
})

integrations.get('/mercadopago', async (c) => {
  const data = await getMercadoPagoConfigStatus(c.env.ARCA_CONFIG)
  return c.json({ data })
})

integrations.put('/mercadopago', zValidator('json', mercadoPagoConfigSchema), async (c) => {
  const input = c.req.valid('json')
  await setMercadoPagoConfig(c.env.ARCA_CONFIG, input)
  const data = await getMercadoPagoConfigStatus(c.env.ARCA_CONFIG)
  return c.json({ data })
})

export { integrations as integrationRoutes }
