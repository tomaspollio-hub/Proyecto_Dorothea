import { api } from '../../../shared/utils/api-client.ts'
import type { DashboardData } from '../types.ts'

export const dashboardApi = {
  get: () => api.get<{ data: DashboardData }>('/dashboard'),
}
