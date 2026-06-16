export type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'QR'

export interface CashRegisterSession {
  id: string
  userId: number
  openingAmountCents: number
  closingAmountCents: number | null
  expectedAmountCents: number | null
  differenceCents: number | null
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  closedAt: string | null
  notes: string | null
}

export interface CashMovement {
  id: string
  sessionId: string
  type: 'INCOME' | 'EXPENSE'
  amountCents: number
  paymentMethod: PaymentMethod
  description: string
  referenceId: string | null
  referenceType: 'SALE' | 'MANUAL'
  userId: number
  createdAt: string
}

export interface PaymentMethodSummaryRow {
  paymentMethod: PaymentMethod
  type: 'INCOME' | 'EXPENSE'
  total: number
}

export interface CurrentSessionResponse {
  session: CashRegisterSession
  movements: CashMovement[]
  summary: PaymentMethodSummaryRow[]
}

export interface SessionHistoryResponse {
  data: CashRegisterSession[]
  meta: { total: number; page: number; pageSize: number }
}
