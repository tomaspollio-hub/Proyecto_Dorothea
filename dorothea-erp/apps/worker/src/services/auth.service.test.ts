import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { testDb } from '../../test/helpers.ts'
import { loginUser, createInitialAdmin, changePassword, refreshUserToken } from './auth.service.ts'
import { UnauthorizedError } from '../utils/errors.ts'

const JWT_SECRET = 'test-secret'

describe('auth.service', () => {
  let db: ReturnType<typeof testDb>

  beforeEach(() => {
    db = testDb(env.DB)
  })

  describe('createInitialAdmin', () => {
    it('crea el admin inicial en una base vacía', async () => {
      await createInitialAdmin(db, 'admin@dorothea.com.ar', 'password123', 'Admin')
      const result = await loginUser(db, 'admin@dorothea.com.ar', 'password123', JWT_SECRET)
      expect(result.user.role).toBe('admin')
    })

    it('rechaza crear un segundo admin si ya existe un usuario (defensa en profundidad)', async () => {
      await createInitialAdmin(db, 'admin@dorothea.com.ar', 'password123', 'Admin')
      await expect(
        createInitialAdmin(db, 'otro@dorothea.com.ar', 'otrapass123', 'Otro'),
      ).rejects.toThrow(UnauthorizedError)
    })
  })

  describe('loginUser', () => {
    it('rechaza credenciales inválidas', async () => {
      await createInitialAdmin(db, 'admin@dorothea.com.ar', 'password123', 'Admin')
      await expect(loginUser(db, 'admin@dorothea.com.ar', 'incorrecta', JWT_SECRET)).rejects.toThrow(
        UnauthorizedError,
      )
    })

    it('rechaza un email que no existe', async () => {
      await expect(loginUser(db, 'no-existe@dorothea.com.ar', 'x', JWT_SECRET)).rejects.toThrow(UnauthorizedError)
    })

    it('genera un refresh token válido para refrescar el JWT', async () => {
      await createInitialAdmin(db, 'admin@dorothea.com.ar', 'password123', 'Admin')
      const login = await loginUser(db, 'admin@dorothea.com.ar', 'password123', JWT_SECRET)
      const refreshed = await refreshUserToken(db, login.refreshToken, JWT_SECRET)
      expect(refreshed.token).toBeTruthy()
    })
  })

  describe('changePassword', () => {
    it('cambia la contraseña y permite loguearse con la nueva', async () => {
      await createInitialAdmin(db, 'admin@dorothea.com.ar', 'password123', 'Admin')
      const login = await loginUser(db, 'admin@dorothea.com.ar', 'password123', JWT_SECRET)

      await changePassword(db, login.user.id, 'password123', 'nuevapass456')

      await expect(loginUser(db, 'admin@dorothea.com.ar', 'password123', JWT_SECRET)).rejects.toThrow(
        UnauthorizedError,
      )
      const newLogin = await loginUser(db, 'admin@dorothea.com.ar', 'nuevapass456', JWT_SECRET)
      expect(newLogin.user.email).toBe('admin@dorothea.com.ar')
    })

    it('rechaza si la contraseña actual es incorrecta', async () => {
      await createInitialAdmin(db, 'admin@dorothea.com.ar', 'password123', 'Admin')
      const login = await loginUser(db, 'admin@dorothea.com.ar', 'password123', JWT_SECRET)

      await expect(changePassword(db, login.user.id, 'incorrecta', 'nuevapass456')).rejects.toThrow(
        UnauthorizedError,
      )
    })

    it('invalida las sesiones existentes (refresh tokens) al cambiar la contraseña', async () => {
      await createInitialAdmin(db, 'admin@dorothea.com.ar', 'password123', 'Admin')
      const login = await loginUser(db, 'admin@dorothea.com.ar', 'password123', JWT_SECRET)

      await changePassword(db, login.user.id, 'password123', 'nuevapass456')

      await expect(refreshUserToken(db, login.refreshToken, JWT_SECRET)).rejects.toThrow(UnauthorizedError)
    })
  })
})
