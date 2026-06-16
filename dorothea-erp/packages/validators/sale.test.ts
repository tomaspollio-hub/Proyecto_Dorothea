import { describe, it, expect } from 'vitest'
import { createSaleSchema } from './sale.ts'

describe('createSaleSchema', () => {
  it('rechaza una venta sin items', () => {
    const result = createSaleSchema.safeParse({
      items: [],
      paymentMethod: 'CASH',
      amountPaidCents: 1000,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza cantidad cero o negativa', () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 'p1', quantity: 0 }],
      paymentMethod: 'CASH',
      amountPaidCents: 1000,
    })
    expect(result.success).toBe(false)
  })

  it('acepta consumidor final (sin customerId)', () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 'p1', quantity: 1 }],
      paymentMethod: 'CASH',
      amountPaidCents: 1000,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza un medio de pago inválido', () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 'p1', quantity: 1 }],
      paymentMethod: 'BITCOIN',
      amountPaidCents: 1000,
    })
    expect(result.success).toBe(false)
  })

  it('aplica default de descuento en cero', () => {
    const result = createSaleSchema.parse({
      items: [{ productId: 'p1', quantity: 1 }],
      paymentMethod: 'CASH',
      amountPaidCents: 1000,
    })
    expect(result.discountCents).toBe(0)
    expect(result.items[0]?.discountCents).toBe(0)
  })
})
