export type UserRole = 'admin' | 'cashier' | 'supervisor'

export interface UserPublic {
  id: number
  email: string
  name: string
  role: UserRole
}

export interface AuthTokenPayload {
  sub: number
  email: string
  name: string
  role: UserRole
  iat: number
  exp: number
}

export interface LoginResponse {
  token: string
  refreshToken: string
  user: UserPublic
}

export interface RefreshResponse {
  token: string
}
