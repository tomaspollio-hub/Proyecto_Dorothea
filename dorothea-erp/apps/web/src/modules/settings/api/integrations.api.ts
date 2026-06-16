import { api } from '../../../shared/utils/api-client.ts'
import type { ArcaConfigInput, MercadoPagoConfigInput } from '@dorothea/validators/integrations'
import type { ArcaConfigStatus, MercadoPagoConfigStatus } from '../types.ts'

export const integrationsApi = {
  getArca: () => api.get<{ data: ArcaConfigStatus }>('/integrations/arca'),
  setArca: (input: ArcaConfigInput) => api.put<{ data: ArcaConfigStatus }>('/integrations/arca', input),

  getMercadoPago: () => api.get<{ data: MercadoPagoConfigStatus }>('/integrations/mercadopago'),
  setMercadoPago: (input: MercadoPagoConfigInput) =>
    api.put<{ data: MercadoPagoConfigStatus }>('/integrations/mercadopago', input),
}
