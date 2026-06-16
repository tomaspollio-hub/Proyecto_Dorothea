import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { testDb } from '../../test/helpers.ts'
import { createProduct, updateProduct, softDeleteProduct, getProductById, listProducts } from './product.service.ts'
import { ConflictError, NotFoundError } from '../utils/errors.ts'

const baseInput = {
  code: 'P-TEST',
  name: 'Producto de prueba',
  priceCents: 100000,
  unit: 'unidad' as const,
  minStock: 0,
  initialStock: 5,
}

describe('product.service', () => {
  let db: ReturnType<typeof testDb>

  beforeEach(() => {
    db = testDb(env.DB)
  })

  it('crea un producto con su registro de inventario inicial', async () => {
    const product = await createProduct(db, baseInput)
    expect(product.code).toBe('P-TEST')
    expect(product.quantity).toBe(5)
  })

  it('no permite dos productos con el mismo código', async () => {
    await createProduct(db, baseInput)
    await expect(createProduct(db, { ...baseInput, name: 'Otro' })).rejects.toThrow(ConflictError)
  })

  it('no incluye productos desactivados (soft delete) por defecto', async () => {
    const product = await createProduct(db, baseInput)
    await softDeleteProduct(db, product.id)

    await expect(getProductById(db, product.id)).rejects.toThrow(NotFoundError)

    const result = await listProducts(db, { page: 1, pageSize: 20 })
    expect(result.data.find((p) => p.id === product.id)).toBeUndefined()
  })

  it('rechaza actualizar a un código ya usado por otro producto', async () => {
    const a = await createProduct(db, baseInput)
    const b = await createProduct(db, { ...baseInput, code: 'P-OTRO' })

    await expect(updateProduct(db, b.id, { code: a.code })).rejects.toThrow(ConflictError)
  })

  it('permite actualizar el nombre sin tocar el código', async () => {
    const product = await createProduct(db, baseInput)
    const updated = await updateProduct(db, product.id, { name: 'Nombre nuevo' })
    expect(updated?.name).toBe('Nombre nuevo')
    expect(updated?.code).toBe('P-TEST')
  })

  it('busca por código o nombre', async () => {
    await createProduct(db, baseInput)
    await createProduct(db, { ...baseInput, code: 'P-OTRO', name: 'Collar de cuero' })

    const byCode = await listProducts(db, { search: 'P-TEST', page: 1, pageSize: 20 })
    expect(byCode.data).toHaveLength(1)

    const byName = await listProducts(db, { search: 'Collar', page: 1, pageSize: 20 })
    expect(byName.data).toHaveLength(1)
    expect(byName.data[0]?.name).toBe('Collar de cuero')
  })
})
