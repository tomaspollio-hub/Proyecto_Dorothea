export interface Customer {
  id: string
  name: string
  cuit: string | null
  fiscalCondition: 'RI' | 'Monotributo' | 'Exento' | 'Consumidor Final'
  email: string | null
  phone: string | null
  address: string | null
  petsNotes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomerListParams {
  search?: string | undefined
  active?: boolean | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export interface CustomerListResponse {
  data: Customer[]
  meta: { total: number; page: number; pageSize: number }
}
