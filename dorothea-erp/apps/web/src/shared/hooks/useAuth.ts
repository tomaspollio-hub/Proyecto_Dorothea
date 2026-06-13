import { useAuthStore } from '../stores/authStore.ts'
import { api } from '../utils/api-client.ts'
import type { LoginResponse } from '@dorothea/shared/types'

export function useAuth() {
  const { user, isAuthenticated, setAuth, setToken, clearAuth, refreshToken } = useAuthStore()

  async function login(email: string, password: string) {
    const res = await api.post<LoginResponse>('/auth/login', { email, password })
    setAuth(res.user, res.token, res.refreshToken)
  }

  async function logout() {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => null)
    }
    clearAuth()
  }

  async function refresh() {
    if (!refreshToken) throw new Error('No hay refresh token')
    const res = await api.post<{ token: string }>('/auth/refresh', { refreshToken })
    setToken(res.token)
    return res.token
  }

  return { user, isAuthenticated, login, logout, refresh }
}
