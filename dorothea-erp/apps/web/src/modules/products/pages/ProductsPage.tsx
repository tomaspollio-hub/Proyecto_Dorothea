import { useState } from 'react'
import { useProducts, useCategories, useDeleteProduct } from '../hooks/useProducts.ts'
import { ProductFormModal } from '../components/ProductFormModal.tsx'
import { StockAdjustModal } from '../components/StockAdjustModal.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { centsToArs } from '../../../shared/utils/money.ts'
import type { ProductListItem } from '../types.ts'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [adjustingStock, setAdjustingStock] = useState<ProductListItem | null>(null)

  const { data, isLoading } = useProducts({ search, categoryId: categoryId || undefined, page, pageSize: 20 })
  const { data: categoriesRes } = useCategories()
  const deleteProduct = useDeleteProduct()

  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete(product: ProductListItem) {
    if (!confirm(`¿Desactivar el producto "${product.name}"?`)) return
    await deleteProduct.mutateAsync(product.id)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <Button onClick={() => setCreatingProduct(true)}>+ Nuevo producto</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="w-64">
          <Input
            placeholder="Buscar por código o nombre"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Todas las categorías</option>
          {categoriesRes?.data.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No se encontraron productos.
                </td>
              </tr>
            )}
            {data?.data.map((product) => {
              const lowStock = (product.quantity ?? 0) <= product.minStock
              return (
                <tr key={product.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{product.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-gray-600">{product.categoryName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{centsToArs(product.priceCents)}</td>
                  <td className="px-4 py-3">
                    <span className={lowStock ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                      {product.quantity ?? 0}
                    </span>
                    {lowStock && <span className="ml-1 text-xs text-red-500">(bajo mínimo)</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setAdjustingStock(product)}
                      className="text-brand-600 hover:underline text-xs"
                    >
                      Stock
                    </button>
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="text-brand-600 hover:underline text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {data && data.meta.total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Página {data.meta.page} de {totalPages} — {data.meta.total} productos
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {creatingProduct && <ProductFormModal onClose={() => setCreatingProduct(false)} />}
      {editingProduct && (
        <ProductFormModal product={editingProduct} onClose={() => setEditingProduct(null)} />
      )}
      {adjustingStock && (
        <StockAdjustModal product={adjustingStock} onClose={() => setAdjustingStock(null)} />
      )}
    </div>
  )
}
