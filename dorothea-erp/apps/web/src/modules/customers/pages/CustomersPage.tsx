import { useState } from 'react'
import { useCustomers, useDeleteCustomer } from '../hooks/useCustomers.ts'
import { CustomerFormModal } from '../components/CustomerFormModal.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import type { Customer } from '../types.ts'

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const { data, isLoading } = useCustomers({ search, page, pageSize: 20 })
  const deleteCustomer = useDeleteCustomer()

  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete(customer: Customer) {
    if (!confirm(`¿Desactivar el cliente "${customer.name}"?`)) return
    await deleteCustomer.mutateAsync(customer.id)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Button onClick={() => setCreatingCustomer(true)}>+ Nuevo cliente</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="w-72">
          <Input
            placeholder="Buscar por nombre, CUIT o teléfono"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">CUIT</th>
              <th className="px-4 py-3 font-medium">Condición</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Email</th>
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
                  No se encontraron clientes.
                </td>
              </tr>
            )}
            {data?.data.map((customer) => (
              <tr key={customer.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                <td className="px-4 py-3 text-gray-600">{customer.cuit ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{customer.fiscalCondition}</td>
                <td className="px-4 py-3 text-gray-600">{customer.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{customer.email ?? '—'}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => setEditingCustomer(customer)}
                    className="text-brand-600 hover:underline text-xs"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(customer)}
                    className="text-red-500 hover:underline text-xs"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Página {data.meta.page} de {totalPages} — {data.meta.total} clientes
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

      {creatingCustomer && <CustomerFormModal onClose={() => setCreatingCustomer(false)} />}
      {editingCustomer && (
        <CustomerFormModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} />
      )}
    </div>
  )
}
