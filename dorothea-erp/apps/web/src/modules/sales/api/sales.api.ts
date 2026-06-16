import { api } from '../../../shared/utils/api-client.ts'
import type { CreateSaleInput } from '@dorothea/validators/sale'
import type { SaleDetail, SaleListResponse } from '../types.ts'

export const salesApi = {
  list: (page: number, pageSize = 20) =>
    api.get<SaleListResponse>(`/sales?page=${page}&pageSize=${pageSize}`),

  get: (id: string) => api.get<{ data: SaleDetail }>(`/sales/${id}`),

  create: (input: CreateSaleInput) => api.post<{ data: SaleDetail }>('/sales', input),

  cancel: (id: string) => api.post<{ data: unknown }>(`/sales/${id}/cancel`, {}),
}
