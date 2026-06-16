import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cashRegisterApi } from '../api/cash-register.api.ts'
import type { OpenSessionInput, CloseSessionInput, CreateMovementInput } from '@dorothea/validators/cash-register'

export function useCurrentSession() {
  return useQuery({
    queryKey: ['cash-register', 'current'],
    queryFn: () => cashRegisterApi.current(),
  })
}

export function useSessionHistory(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['cash-register', 'history', page, pageSize],
    queryFn: () => cashRegisterApi.history(page, pageSize),
  })
}

export function useOpenSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OpenSessionInput) => cashRegisterApi.open(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
    },
  })
}

export function useCreateMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMovementInput) => cashRegisterApi.createMovement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register', 'current'] })
    },
  })
}

export function useCloseSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CloseSessionInput) => cashRegisterApi.close(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
    },
  })
}
