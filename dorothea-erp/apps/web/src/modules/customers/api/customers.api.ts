import { api } from '../../../shared/utils/api-client.ts'
import type { CreateCustomerInput, UpdateCustomerInput } from '@dorothea/validators/customer'
import type { Customer, CustomerListParams, CustomerListResponse } from '../types.ts'

function buildQuery(params: CustomerListParams): string {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.active !== undefined) query.set('active', String(params.active))
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 20))
  return query.toString()
}

export const customersApi = {
  list: (params: CustomerListParams) => api.get<CustomerListResponse>(`/customers?${buildQuery(params)}`),

  get: (id: string) => api.get<{ data: Customer }>(`/customers/${id}`),

  create: (input: CreateCustomerInput) => api.post<{ data: Customer }>('/customers', input),

  update: (id: string, input: UpdateCustomerInput) =>
    api.patch<{ data: Customer }>(`/customers/${id}`, input),

  remove: (id: string) => api.delete<{ data: { ok: true } }>(`/customers/${id}`),
}
