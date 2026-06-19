import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard.api.ts'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await dashboardApi.get()
      return res.data
    },
    refetchInterval: 60_000,
  })
}
