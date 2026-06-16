import { describe, it, expect } from 'vitest'
import { centsToArs, arsToCents } from './money.ts'

describe('arsToCents', () => {
  it('convierte pesos a centavos', () => {
    expect(arsToCents(1500.5)).toBe(150050)
  })

  it('redondea correctamente', () => {
    expect(arsToCents(10.005)).toBe(1001)
  })

  it('maneja cero', () => {
    expect(arsToCents(0)).toBe(0)
  })
})

describe('centsToArs', () => {
  it('formatea centavos como moneda argentina', () => {
    expect(centsToArs(150050)).toBe('$ 1.500,50')
  })

  it('formatea cero', () => {
    expect(centsToArs(0)).toBe('$ 0,00')
  })

  it('es la inversa de arsToCents', () => {
    const original = 2599.99
    expect(centsToArs(arsToCents(original))).toBe('$ 2.599,99')
  })
})
