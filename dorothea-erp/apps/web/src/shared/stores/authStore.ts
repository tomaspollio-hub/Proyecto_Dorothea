import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPublic } from '@dorothea/shared/types'

interface AuthState {
  user: UserPublic | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: UserPublic, token: string, refreshToken: string) => void
  setToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('auth_token', token)
        set({ user, token, refreshToken, isAuthenticated: true })
      },

      setToken: (token) => {
        localStorage.setItem('auth_token', token)
        set({ token })
      },

      clearAuth: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'dorothea-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
