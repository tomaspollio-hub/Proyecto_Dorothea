import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../api/sales.api.ts'
import type { CreateSaleInput } from '@dorothea/validators/sale'
import type { ReturnSaleItemsInput } from '../types.ts'

export function useSalesHistory(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['sales', page, pageSize],
    queryFn: () => salesApi.list(page, pageSize),
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSaleInput) => salesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
    },
  })
}

export function useCancelSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => salesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
    },
  })
}

export function useReturnSaleItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ saleId, input }: { saleId: string; input: ReturnSaleItemsInput }) =>
      salesApi.returnItems(saleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
