import { describe, it, expect } from 'vitest'
import { isValidCuit, createCustomerSchema } from './customer.ts'

describe('isValidCuit', () => {
  it('acepta un CUIT real válido', () => {
    expect(isValidCuit('30-50000091-7')).toBe(true)
  })

  it('acepta el mismo CUIT sin guiones', () => {
    expect(isValidCuit('30500000917')).toBe(true)
  })

  it('rechaza un CUIT con dígito verificador incorrecto', () => {
    expect(isValidCuit('30-50000091-8')).toBe(false)
  })

  it('rechaza un CUIT inventado al azar', () => {
    expect(isValidCuit('20-12345678-9')).toBe(false)
  })

  it('rechaza longitudes incorrectas', () => {
    expect(isValidCuit('123')).toBe(false)
    expect(isValidCuit('30-50000091-77')).toBe(false)
  })

  it('rechaza vacío', () => {
    expect(isValidCuit('')).toBe(false)
  })
})

describe('createCustomerSchema', () => {
  it('acepta un cliente sin CUIT (consumidor final)', () => {
    const result = createCustomerSchema.safeParse({ name: 'Juan Perez' })
    expect(result.success).toBe(true)
  })

  it('rechaza un CUIT inválido aunque el resto sea correcto', () => {
    const result = createCustomerSchema.safeParse({ name: 'Juan Perez', cuit: '20-12345678-9' })
    expect(result.success).toBe(false)
  })

  it('acepta un CUIT válido', () => {
    const result = createCustomerSchema.safeParse({ name: 'Juan Perez', cuit: '30-50000091-7' })
    expect(result.success).toBe(true)
  })

  it('rechaza nombre vacío', () => {
    const result = createCustomerSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
