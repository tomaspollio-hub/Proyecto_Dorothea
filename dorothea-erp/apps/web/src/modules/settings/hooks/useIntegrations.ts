import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { integrationsApi } from '../api/integrations.api.ts'
import type { ArcaConfigInput, MercadoPagoConfigInput } from '@dorothea/validators/integrations'

export function useArcaConfig() {
  return useQuery({
    queryKey: ['integrations', 'arca'],
    queryFn: () => integrationsApi.getArca(),
  })
}

export function useSetArcaConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ArcaConfigInput) => integrationsApi.setArca(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', 'arca'] }),
  })
}

export function useMercadoPagoConfig() {
  return useQuery({
    queryKey: ['integrations', 'mercadopago'],
    queryFn: () => integrationsApi.getMercadoPago(),
  })
}

export function useSetMercadoPagoConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MercadoPagoConfigInput) => integrationsApi.setMercadoPago(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', 'mercadopago'] }),
  })
}
