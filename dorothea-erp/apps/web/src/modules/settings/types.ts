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
