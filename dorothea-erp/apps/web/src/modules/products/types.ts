export interface Category {
  id: string
  name: string
  parentId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductListItem {
  id: string
  code: string
  name: string
  description: string | null
  priceCents: number
  costCents: number | null
  categoryId: string | null
  categoryName: string | null
  ivaRateId: string | null
  ivaRateName: string | null
  ivaRate: number | null
  unit: 'unidad' | 'kg' | 'litro'
  minStock: number
  imageR2Key: string | null
  active: boolean
  quantity: number | null
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  productId: string
  quantityChange: number
  type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN'
  referenceId: string | null
  referenceType: 'SALE' | 'PURCHASE' | 'MANUAL' | null
  notes: string | null
  userId: number
  createdAt: string
}

export interface LowStockProduct {
  id: string
  code: string
  name: string
  minStock: number
  quantity: number
}

export interface ProductListParams {
  search?: string | undefined
  categoryId?: string | undefined
  active?: boolean | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export interface ProductListResponse {
  data: ProductListItem[]
  meta: { total: number; page: number; pageSize: number }
}
