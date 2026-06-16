import { api } from '../../../shared/utils/api-client.ts'
import type { CreateProductInput, UpdateProductInput } from '@dorothea/validators/product'
import type { AdjustStockInput } from '@dorothea/validators/inventory'
import type {
  ProductListItem,
  ProductListParams,
  ProductListResponse,
  InventoryMovement,
  LowStockProduct,
} from '../types.ts'

function buildQuery(params: ProductListParams): string {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.categoryId) query.set('categoryId', params.categoryId)
  if (params.active !== undefined) query.set('active', String(params.active))
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 20))
  return query.toString()
}

export const productsApi = {
  list: (params: ProductListParams) => api.get<ProductListResponse>(`/products?${buildQuery(params)}`),

  get: (id: string) => api.get<{ data: ProductListItem }>(`/products/${id}`),

  create: (input: CreateProductInput) => api.post<{ data: ProductListItem }>('/products', input),

  update: (id: string, input: UpdateProductInput) =>
    api.patch<{ data: ProductListItem }>(`/products/${id}`, input),

  remove: (id: string) => api.delete<{ data: { ok: true } }>(`/products/${id}`),

  uploadImage: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.upload<{ data: ProductListItem }>(`/products/${id}/image`, formData)
  },

  adjustStock: (id: string, input: AdjustStockInput) =>
    api.post<{ data: { quantity: number } }>(`/products/${id}/stock`, input),

  movements: (id: string) => api.get<{ data: InventoryMovement[] }>(`/products/${id}/movements`),

  lowStock: () => api.get<{ data: LowStockProduct[] }>('/inventory/low-stock'),
}
