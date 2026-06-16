import type { ArcaConfigInput, MercadoPagoConfigInput } from '@dorothea/validators/integrations'

const ARCA_KEY = 'integration:arca'
const MERCADOPAGO_KEY = 'integration:mercadopago'

function mask(value: string): string {
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`
}

export interface ArcaConfigStatus {
  configured: boolean
  cuit?: string
  environment?: 'homologacion' | 'produccion'
  certPreview?: string
}

export interface MercadoPagoConfigStatus {
  configured: boolean
  environment?: 'sandbox' | 'produccion'
  accessTokenPreview?: string
  publicKeyPreview?: string
  hasWebhookSecret?: boolean
}

export async function getArcaConfigStatus(kv: KVNamespace): Promise<ArcaConfigStatus> {
  const raw = await kv.get(ARCA_KEY)
  if (!raw) return { configured: false }

  const config = JSON.parse(raw) as ArcaConfigInput
  return {
    configured: true,
    cuit: config.cuit,
    environment: config.environment,
    certPreview: mask(config.certPem),
  }
}

export async function setArcaConfig(kv: KVNamespace, input: ArcaConfigInput): Promise<void> {
  await kv.put(ARCA_KEY, JSON.stringify(input))
}

export async function getArcaConfig(kv: KVNamespace): Promise<ArcaConfigInput | null> {
  const raw = await kv.get(ARCA_KEY)
  return raw ? (JSON.parse(raw) as ArcaConfigInput) : null
}

export async function getMercadoPagoConfigStatus(kv: KVNamespace): Promise<MercadoPagoConfigStatus> {
  const raw = await kv.get(MERCADOPAGO_KEY)
  if (!raw) return { configured: false }

  const config = JSON.parse(raw) as MercadoPagoConfigInput
  return {
    configured: true,
    environment: config.environment,
    accessTokenPreview: mask(config.accessToken),
    publicKeyPreview: mask(config.publicKey),
    hasWebhookSecret: !!config.webhookSecret,
  }
}

export async function setMercadoPagoConfig(kv: KVNamespace, input: MercadoPagoConfigInput): Promise<void> {
  await kv.put(MERCADOPAGO_KEY, JSON.stringify(input))
}

export async function getMercadoPagoConfig(kv: KVNamespace): Promise<MercadoPagoConfigInput | null> {
  const raw = await kv.get(MERCADOPAGO_KEY)
  return raw ? (JSON.parse(raw) as MercadoPagoConfigInput) : null
}
