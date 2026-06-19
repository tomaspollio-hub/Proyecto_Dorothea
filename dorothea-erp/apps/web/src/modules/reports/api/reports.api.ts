import { api } from '../../../shared/utils/api-client.ts'
import type { SalesReport } from '../types.ts'

export const reportsApi = {
  getSales: (from: string, to: string) =>
    api.get<{ data: SalesReport }>(`/reports/sales?from=${from}&to=${to}`),
}
