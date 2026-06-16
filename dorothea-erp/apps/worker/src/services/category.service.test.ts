import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { testDb } from '../../test/helpers.ts'
import { listCategories, createCategory, updateCategory, deactivateCategory } from './category.service.ts'
import { NotFoundError } from '../utils/errors.ts'

describe('category.service', () => {
  let db: ReturnType<typeof testDb>

  beforeEach(() => {
    db = testDb(env.DB)
  })

  it('crea una categoría', async () => {
    const category = await createCategory(db, { name: 'Alimentos' })
    expect(category?.name).toBe('Alimentos')
    expect(category?.active).toBe(true)
  })

  it('lista categorías ordenadas por nombre', async () => {
    await createCategory(db, { name: 'Zzz Categoria Test' })
    await createCategory(db, { name: 'Aaa Categoria Test' })

    const list = await listCategories(db)
    const names = list.map((c) => c.name)
    expect(names.indexOf('Aaa Categoria Test')).toBeLessThan(names.indexOf('Zzz Categoria Test'))
  })

  it('actualiza una categoría existente', async () => {
    const category = await createCategory(db, { name: 'Higiene' })
    const updated = await updateCategory(db, category!.id, { name: 'Higiene y Cuidado' })
    expect(updated?.name).toBe('Higiene y Cuidado')
  })

  it('lanza NotFoundError al actualizar una categoría inexistente', async () => {
    await expect(updateCategory(db, 'no-existe', { name: 'x' })).rejects.toThrow(NotFoundError)
  })

  it('desactiva una categoría sin borrarla', async () => {
    const category = await createCategory(db, { name: 'Juguetes' })
    await deactivateCategory(db, category!.id)

    const list = await listCategories(db)
    const found = list.find((c) => c.id === category!.id)
    expect(found?.active).toBe(false)
  })
})
