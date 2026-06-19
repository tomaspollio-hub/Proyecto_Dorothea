import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api/reports.api.ts'

export function useReports(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'sales', from, to],
    queryFn: async () => {
      const res = await reportsApi.getSales(from, to)
      return res.data
    },
    enabled: Boolean(from && to),
  })
}
