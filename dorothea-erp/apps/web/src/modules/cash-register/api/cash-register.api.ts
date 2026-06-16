import { api } from '../../../shared/utils/api-client.ts'
import type { OpenSessionInput, CloseSessionInput, CreateMovementInput } from '@dorothea/validators/cash-register'
import type { CashRegisterSession, CurrentSessionResponse, SessionHistoryResponse } from '../types.ts'

export const cashRegisterApi = {
  current: () => api.get<{ data: CurrentSessionResponse | null }>('/cash-register/current'),

  open: (input: OpenSessionInput) => api.post<{ data: CashRegisterSession }>('/cash-register/open', input),

  createMovement: (input: CreateMovementInput) =>
    api.post<{ data: unknown }>('/cash-register/movements', input),

  close: (input: CloseSessionInput) => api.post<{ data: CashRegisterSession }>('/cash-register/close', input),

  history: (page: number, pageSize: number) =>
    api.get<SessionHistoryResponse>(`/cash-register/history?page=${page}&pageSize=${pageSize}`),
}
