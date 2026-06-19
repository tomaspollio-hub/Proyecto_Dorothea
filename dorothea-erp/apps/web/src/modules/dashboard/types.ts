export interface DashboardData {
  today: {
    totalCents: number
    count: number
    avgTicketCents: number
  }
  salesLast7Days: Array<{
    day: string
    totalCents: number
    count: number
  }>
  topProducts: Array<{
    productName: string
    totalQuantity: number
    totalCents: number
  }>
  lowStock: Array<{
    id: string
    name: string
    minStock: number
    quantity: number
  }>
  cashRegister:
    | { status: 'OPEN'; openedAt: string; estimatedCashCents: number | null }
    | { status: 'CLOSED'; openedAt: null; estimatedCashCents: null }
}
