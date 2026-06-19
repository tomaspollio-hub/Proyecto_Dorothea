export interface SalesReport {
  summary: { totalCents: number; count: number; avgTicketCents: number }
  byDay: Array<{ day: string; totalCents: number; count: number }>
  byPaymentMethod: Array<{ paymentMethod: string; totalCents: number; count: number }>
  topProducts: Array<{ productName: string; totalQuantity: number; totalCents: number }>
}
