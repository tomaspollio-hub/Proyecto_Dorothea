import { z } from 'zod'

export const arcaConfigSchema = z.object({
  cuit: z.string().min(11, 'El CUIT debe tener 11 dígitos').max(11),
  certPem: z.string().min(1, 'El certificado es requerido'),
  privateKeyPem: z.string().min(1, 'La clave privada es requerida'),
  environment: z.enum(['homologacion', 'produccion']).default('homologacion'),
})

export const mercadoPagoConfigSchema = z.object({
  accessToken: z.string().min(1, 'El access token es requerido'),
  publicKey: z.string().min(1, 'La public key es requerida'),
  webhookSecret: z.string().min(1).nullable().optional(),
  environment: z.enum(['sandbox', 'produccion']).default('sandbox'),
})

export type ArcaConfigInput = z.infer<typeof arcaConfigSchema>
export type MercadoPagoConfigInput = z.infer<typeof mercadoPagoConfigSchema>
