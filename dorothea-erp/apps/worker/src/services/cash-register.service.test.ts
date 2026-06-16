import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { testDb, seedUser } from '../../test/helpers.ts'
import {
  openSession,
  getOpenSession,
  createMovement,
  closeSession,
} from './cash-register.service.ts'
import { ConflictError, NotFoundError } from '../utils/errors.ts'

describe('cash-register.service', () => {
  let db: ReturnType<typeof testDb>
  let userId: number

  beforeEach(async () => {
    db = testDb(env.DB)
    const user = await seedUser(db)
    userId = user.id
  })

  it('abre una caja con monto inicial', async () => {
    const session = await openSession(db, { openingAmountCents: 1000000 }, userId)
    expect(session?.status).toBe('OPEN')
    expect(session?.openingAmountCents).toBe(1000000)
  })

  it('no permite abrir dos cajas a la vez', async () => {
    await openSession(db, { openingAmountCents: 1000000 }, userId)
    await expect(openSession(db, { openingAmountCents: 500000 }, userId)).rejects.toThrow(ConflictError)
  })

  it('no permite registrar movimientos sin caja abierta', async () => {
    await expect(
      createMovement(db, { type: 'INCOME', amountCents: 1000, paymentMethod: 'CASH', description: 'x' }, userId),
    ).rejects.toThrow(NotFoundError)
  })

  it('calcula el cuadre correctamente: solo el efectivo afecta el monto esperado', async () => {
    await openSession(db, { openingAmountCents: 1000000 }, userId)

    await createMovement(
      db,
      { type: 'INCOME', amountCents: 500000, paymentMethod: 'CASH', description: 'venta efectivo' },
      userId,
    )
    await createMovement(
      db,
      { type: 'INCOME', amountCents: 300000, paymentMethod: 'DEBIT', description: 'venta débito' },
      userId,
    )
    await createMovement(
      db,
      { type: 'EXPENSE', amountCents: 200000, paymentMethod: 'CASH', description: 'pago proveedor' },
      userId,
    )

    // esperado: 1000000 + 500000 (cash income) - 200000 (cash expense) = 1300000
    const closed = await closeSession(db, { closingAmountCents: 1290000 })

    expect(closed?.expectedAmountCents).toBe(1300000)
    expect(closed?.differenceCents).toBe(-10000)
    expect(closed?.status).toBe('CLOSED')
  })

  it('no afecta el cuadre si solo hay movimientos no efectivo', async () => {
    await openSession(db, { openingAmountCents: 1000000 }, userId)
    await createMovement(
      db,
      { type: 'INCOME', amountCents: 999999, paymentMethod: 'TRANSFER', description: 'venta transferencia' },
      userId,
    )

    const closed = await closeSession(db, { closingAmountCents: 1000000 })
    expect(closed?.expectedAmountCents).toBe(1000000)
    expect(closed?.differenceCents).toBe(0)
  })

  it('después de cerrar, no hay caja abierta', async () => {
    await openSession(db, { openingAmountCents: 1000000 }, userId)
    await closeSession(db, { closingAmountCents: 1000000 })
    const open = await getOpenSession(db)
    expect(open).toBeNull()
  })
})
