import { api } from '../../../shared/utils/api-client.ts'
import type { CreateUserInput, UpdateUserInput } from '@dorothea/validators/user'
import type { ManagedUser } from '../types.ts'

export const usersApi = {
  list: () => api.get<{ data: ManagedUser[] }>('/users'),
  create: (input: CreateUserInput) => api.post<{ data: ManagedUser }>('/users', input),
  update: (id: number, input: UpdateUserInput) => api.patch<{ data: ManagedUser }>(`/users/${id}`, input),
  resetPassword: (id: number, newPassword: string) =>
    api.post<{ data: { ok: true } }>(`/users/${id}/reset-password`, { newPassword }),
}
