export type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'QR'

export interface Sale {
  id: string
  customerId: string | null
  userId: number
  cashRegisterSessionId: string
  subtotalCents: number
  discountCents: number
  totalIvaCents: number
  totalCents: number
  paymentMethod: PaymentMethod
  amountPaidCents: number
  changeCents: number
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING_INVOICE'
  notes: string | null
  createdAt: string
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  productName: string
  quantity: number
  unitPriceCents: number
  discountCents: number
  ivaRate: number
  ivaAmountCents: number
  subtotalCents: number
}

export interface SaleDetail {
  sale: Sale
  items: SaleItem[]
}

export interface SaleListResponse {
  data: Sale[]
  meta: { total: number; page: number; pageSize: number }
}

export interface CartItem {
  productId: string
  code: string
  name: string
  unitPriceCents: number
  quantity: number
  discountCents: number
  availableStock: number
}
