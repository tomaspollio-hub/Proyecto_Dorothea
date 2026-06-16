import { api } from '../../../shared/utils/api-client.ts'
import type { ChangePasswordInput } from '@dorothea/validators/auth'

export const authApi = {
  changePassword: (input: ChangePasswordInput) => api.patch<{ ok: true }>('/auth/password', input),
}
