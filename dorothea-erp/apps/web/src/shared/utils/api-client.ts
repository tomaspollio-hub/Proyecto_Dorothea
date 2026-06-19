const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

async function tryRefreshToken(): Promise<string | null> {
  // Importación dinámica para evitar dependencia circular con el store
  const { useAuthStore } = await import('../stores/authStore.ts')
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json() as { token: string }
    useAuthStore.getState().setToken(data.token)
    return data.token
  } catch {
    return null
  }
}

function buildHeaders(token: string | null, extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token')

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(token, options?.headers),
  })

  if (res.status === 401 && !path.startsWith('/auth/')) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      const retry = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: buildHeaders(newToken, options?.headers),
      })
      const retryData = await retry.json() as T & { error?: string; code?: string }
      if (!retry.ok) {
        throw new ApiError(retry.status, retryData.code ?? 'UNKNOWN', retryData.error ?? 'Error desconocido')
      }
      return retryData
    }

    const { useAuthStore } = await import('../stores/authStore.ts')
    useAuthStore.getState().clearAuth()
    window.location.href = '/login'
    throw new ApiError(401, 'UNAUTHORIZED', 'Sesión expirada')
  }

  const data = await res.json() as T & { error?: string; code?: string }

  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? 'UNKNOWN', data.error ?? 'Error desconocido')
  }

  return data
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem('auth_token')

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const data = await res.json() as T & { error?: string; code?: string }

  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? 'UNKNOWN', data.error ?? 'Error desconocido')
  }

  return data
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload,
}
