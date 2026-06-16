import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { testDb } from '../../test/helpers.ts'
import { createCustomer, updateCustomer, softDeleteCustomer, listCustomers, getCustomerById } from './customer.service.ts'
import { ConflictError, NotFoundError } from '../utils/errors.ts'
import type { CreateCustomerInput } from '@dorothea/validators/customer'

function customerInput(overrides: Partial<CreateCustomerInput> & { name: string }): CreateCustomerInput {
  return { fiscalCondition: 'Consumidor Final', ...overrides }
}

describe('customer.service', () => {
  let db: ReturnType<typeof testDb>

  beforeEach(() => {
    db = testDb(env.DB)
  })

  it('crea un cliente sin CUIT (consumidor final)', async () => {
    const customer = await createCustomer(db, customerInput({ name: 'Juan Perez' }))
    expect(customer.fiscalCondition).toBe('Consumidor Final')
    expect(customer.cuit).toBeNull()
  })

  it('no permite dos clientes con el mismo CUIT', async () => {
    await createCustomer(db, customerInput({ name: 'Juan Perez', cuit: '30-50000091-7' }))
    await expect(
      createCustomer(db, customerInput({ name: 'Otro Juan', cuit: '30-50000091-7' })),
    ).rejects.toThrow(ConflictError)
  })

  it('busca por nombre parcial', async () => {
    await createCustomer(db, customerInput({ name: 'Juan Perez' }))
    await createCustomer(db, customerInput({ name: 'Maria Lopez' }))

    const result = await listCustomers(db, { search: 'Perez', page: 1, pageSize: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.name).toBe('Juan Perez')
  })

  it('no incluye clientes desactivados (soft delete) en la búsqueda', async () => {
    const customer = await createCustomer(db, customerInput({ name: 'Cliente Borrado' }))
    await softDeleteCustomer(db, customer.id)

    await expect(getCustomerById(db, customer.id)).rejects.toThrow(NotFoundError)

    const result = await listCustomers(db, { page: 1, pageSize: 20 })
    expect(result.data.find((c) => c.id === customer.id)).toBeUndefined()
  })

  it('permite actualizar el CUIT a otro libre', async () => {
    const customer = await createCustomer(db, customerInput({ name: 'Juan Perez' }))
    const updated = await updateCustomer(db, customer.id, { cuit: '30-50000091-7' })
    expect(updated?.cuit).toBe('30-50000091-7')
  })

  it('rechaza actualizar a un CUIT ya usado por otro cliente', async () => {
    await createCustomer(db, customerInput({ name: 'Juan Perez', cuit: '30-50000091-7' }))
    const other = await createCustomer(db, customerInput({ name: 'Maria Lopez' }))

    await expect(updateCustomer(db, other.id, { cuit: '30-50000091-7' })).rejects.toThrow(ConflictError)
  })
})
