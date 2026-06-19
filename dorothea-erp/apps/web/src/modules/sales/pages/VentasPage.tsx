import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createSaleSchema } from '@dorothea/validators/sale'
import { useProducts } from '../../products/hooks/useProducts.ts'
import { useCustomers } from '../../customers/hooks/useCustomers.ts'
import { useCurrentSession } from '../../cash-register/hooks/useCashRegister.ts'
import { useCreateSale, useSalesHistory, useCancelSale } from '../hooks/useSales.ts'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { ReceiptModal } from '../components/ReceiptModal.tsx'
import { centsToArs, arsToCents } from '../../../shared/utils/money.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'
import type { CartItem } from '../types.ts'
import type { SaleDetail } from '../types.ts'

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  QR: 'QR',
}

export function VentasPage() {
  const { data: currentSessionRes, isLoading: loadingSession } = useCurrentSession()
  const hasOpenSession = !!currentSessionRes?.data

  const [search, setSearch] = useState('')
  const { data: productsRes } = useProducts({ search, active: true, pageSize: 10 })
  const { data: customersRes } = useCustomers({ pageSize: 100 })

  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'QR'>('CASH')
  const [discountArs, setDiscountArs] = useState('0')
  const [amountPaidArs, setAmountPaidArs] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<SaleDetail | null>(null)
  const [receiptCustomerName, setReceiptCustomerName] = useState<string | undefined>()

  const createSale = useCreateSale()
  const { data: historyRes } = useSalesHistory(1)
  const cancelSale = useCancelSale()

  const subtotalCents = cart.reduce((acc, item) => acc + item.unitPriceCents * item.quantity - item.discountCents, 0)
  const discountCents = Math.max(0, arsToCents(Number(discountArs) || 0))
  const totalCents = Math.max(0, subtotalCents - discountCents)
  const amountPaidCents = arsToCents(Number(amountPaidArs) || 0)
  const changeCents = amountPaidCents - totalCents

  function addToCart(product: { id: string; code: string; name: string; priceCents: number; quantity: number | null }) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      const available = product.quantity ?? 0
      if (existing) {
        if (existing.quantity >= available) return prev
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      if (available <= 0) return prev
      return [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          unitPriceCents: product.priceCents,
          quantity: 1,
          discountCents: 0,
          availableStock: available,
        },
      ]
    })
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.availableStock)) }
          : item,
      ),
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  function resetForm() {
    setCart([])
    setCustomerId('')
    setPaymentMethod('CASH')
    setDiscountArs('0')
    setAmountPaidArs('')
    setError(null)
  }

  async function handleConfirm() {
    setError(null)
    try {
      const input = createSaleSchema.parse({
        customerId: customerId || null,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountCents: item.discountCents,
        })),
        discountCents,
        paymentMethod,
        amountPaidCents,
      })
      const result = await createSale.mutateAsync(input)
      const selectedCustomer = customersRes?.data.find((c) => c.id === customerId)
      setReceiptCustomerName(selectedCustomer?.name)
      setReceipt(result.data)
      resetForm()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al confirmar la venta'
      setError(message)
    }
  }

  async function handleCancel(saleId: string) {
    if (!confirm('¿Cancelar esta venta? Se repondrá el stock y se revertirá el ingreso de caja.')) return
    await cancelSale.mutateAsync(saleId);
  }

  if (loadingSession) return <div className="p-8 text-gray-400">Cargando...</div>

  if (!hasOpenSession) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Ventas</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No hay una caja abierta. <Link to="/caja" className="text-brand-600 underline">Abrí la caja</Link> antes
          de registrar ventas.
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ventas</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Input
            placeholder="Buscar producto por código o nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="bg-white rounded-xl border border-gray-200 mt-3 divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {productsRes?.data.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={(product.quantity ?? 0) <= 0}
                className="w-full flex justify-between items-center px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>
                  <span className="text-gray-400 mr-2">{product.code}</span>
                  {product.name}
                </span>
                <span className="text-gray-600">
                  {centsToArs(product.priceCents)} · stock {product.quantity ?? 0}
                </span>
              </button>
            ))}
            {productsRes?.data.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">Sin resultados.</p>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">Cant.</th>
                  <th className="px-3 py-2 font-medium">Subtotal</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                      El carrito está vacío.
                    </td>
                  </tr>
                )}
                {cart.map((item) => (
                  <tr key={item.productId} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-800">{item.name}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={item.availableStock}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {centsToArs(item.unitPriceCents * item.quantity - item.discountCents)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Cliente (opcional)</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Consumidor Final</option>
                {customersRes?.data.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Medio de pago</label>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Descuento (ARS)"
                type="number"
                value={discountArs}
                onChange={(e) => setDiscountArs(e.target.value)}
              />
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{centsToArs(subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{centsToArs(totalCents)}</span>
            </div>

            <Input
              label="Monto pagado (ARS)"
              type="number"
              value={amountPaidArs}
              onChange={(e) => setAmountPaidArs(e.target.value)}
            />

            {amountPaidArs && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Vuelto</span>
                <span>{centsToArs(Math.max(0, changeCents))}</span>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button onClick={handleConfirm} isLoading={createSale.isPending} disabled={cart.length === 0}>
              Confirmar venta
            </Button>
          </div>
        </div>
      </div>

      {historyRes && historyRes.data.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ventas de hoy</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Medio</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {historyRes.data.map((sale) => (
                  <tr key={sale.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500">{new Date(sale.createdAt).toLocaleTimeString('es-AR')}</td>
                    <td className="px-4 py-3 text-gray-600">{paymentMethodLabels[sale.paymentMethod]}</td>
                    <td className="px-4 py-3 text-gray-800">{centsToArs(sale.totalCents)}</td>
                    <td className="px-4 py-3">
                      <span className={sale.status === 'CANCELLED' ? 'text-red-500' : 'text-gray-700'}>
                        {sale.status === 'CANCELLED' ? 'Cancelada' : 'Completada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sale.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancel(sale.id)}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receipt && (
        <ReceiptModal
          sale={receipt}
          customerName={receiptCustomerName}
          onClose={() => { setReceipt(null); setReceiptCustomerName(undefined) }}
        />
      )}
    </div>
  )
}
