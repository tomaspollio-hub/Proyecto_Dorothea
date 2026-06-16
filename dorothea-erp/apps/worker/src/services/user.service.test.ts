import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { testDb } from '../../test/helpers.ts'
import { listUsers, createUser, updateUser, adminResetPassword } from './user.service.ts'
import { loginUser } from './auth.service.ts'
import { ConflictError, ValidationError, NotFoundError } from '../utils/errors.ts'

const JWT_SECRET = 'test-secret'

describe('user.service', () => {
  let db: ReturnType<typeof testDb>

  beforeEach(() => {
    db = testDb(env.DB)
  })

  it('crea un usuario cajero', async () => {
    const user = await createUser(db, { email: 'cajero@dorothea.com.ar', password: 'pass123', name: 'Cajero Uno', role: 'cashier' })
    expect(user?.role).toBe('cashier')
    expect(user?.isActive).toBe(true)
  })

  it('no permite dos usuarios con el mismo email', async () => {
    await createUser(db, { email: 'cajero@dorothea.com.ar', password: 'pass123', name: 'Cajero Uno', role: 'cashier' })
    await expect(
      createUser(db, { email: 'cajero@dorothea.com.ar', password: 'otra123', name: 'Otro', role: 'cashier' }),
    ).rejects.toThrow(ConflictError)
  })

  it('no permite que un admin se desactive a sí mismo', async () => {
    const admin = await createUser(db, { email: 'admin@dorothea.com.ar', password: 'pass123', name: 'Admin', role: 'admin' })
    await expect(updateUser(db, admin!.id, { isActive: false }, admin!.id)).rejects.toThrow(ValidationError)
  })

  it('no permite que un admin se quite el rol admin a sí mismo', async () => {
    const admin = await createUser(db, { email: 'admin@dorothea.com.ar', password: 'pass123', name: 'Admin', role: 'admin' })
    await expect(updateUser(db, admin!.id, { role: 'cashier' }, admin!.id)).rejects.toThrow(ValidationError)
  })

  it('permite desactivar a otro usuario y eso invalida sus sesiones', async () => {
    const admin = await createUser(db, { email: 'admin@dorothea.com.ar', password: 'pass123', name: 'Admin', role: 'admin' })
    const cashier = await createUser(db, { email: 'cajero@dorothea.com.ar', password: 'pass123', name: 'Cajero', role: 'cashier' })

    const login = await loginUser(db, 'cajero@dorothea.com.ar', 'pass123', JWT_SECRET)
    expect(login.token).toBeTruthy()

    await updateUser(db, cashier!.id, { isActive: false }, admin!.id)
    await expect(loginUser(db, 'cajero@dorothea.com.ar', 'pass123', JWT_SECRET)).rejects.toThrow()
  })

  it('admin puede resetear la contraseña de otro usuario', async () => {
    const cashier = await createUser(db, { email: 'cajero@dorothea.com.ar', password: 'pass123', name: 'Cajero', role: 'cashier' })

    await adminResetPassword(db, cashier!.id, 'nuevapass456')

    await expect(loginUser(db, 'cajero@dorothea.com.ar', 'pass123', JWT_SECRET)).rejects.toThrow()
    const login = await loginUser(db, 'cajero@dorothea.com.ar', 'nuevapass456', JWT_SECRET)
    expect(login.user.email).toBe('cajero@dorothea.com.ar')
  })

  it('lanza NotFoundError al actualizar un usuario inexistente', async () => {
    await expect(updateUser(db, 9999, { name: 'x' }, 1)).rejects.toThrow(NotFoundError)
  })

  it('lista usuarios sin exponer el hash de la contraseña', async () => {
    await createUser(db, { email: 'cajero@dorothea.com.ar', password: 'pass123', name: 'Cajero', role: 'cashier' })
    const list = await listUsers(db)
    expect(list[0]).not.toHaveProperty('passwordHash')
  })
})
