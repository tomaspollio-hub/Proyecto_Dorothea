import { useState } from 'react'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { centsToArs } from '../../../shared/utils/money.ts'
import { useReturnSaleItems } from '../hooks/useSales.ts'
import type { SaleDetail } from '../types.ts'

interface ReturnModalProps {
  sale: SaleDetail
  onClose: () => void
}

export function ReturnModal({ sale, onClose }: ReturnModalProps) {
  const returnMutation = useReturnSaleItems()

  // Track selected items: map from saleItemId -> quantity to return (0 means not selected)
  const [selections, setSelections] = useState<Record<string, { selected: boolean; quantity: number }>>(() =>
    Object.fromEntries(sale.items.map((item) => [item.id, { selected: false, quantity: item.quantity }])),
  )

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function toggleItem(saleItemId: string) {
    setSelections((prev) => ({
      ...prev,
      [saleItemId]: { ...prev[saleItemId]!, selected: !prev[saleItemId]!.selected },
    }))
  }

  function setQuantity(saleItemId: string, quantity: number) {
    setSelections((prev) => ({
      ...prev,
      [saleItemId]: { ...prev[saleItemId]!, quantity },
    }))
  }

  const selectedItems = sale.items.filter((item) => selections[item.id]?.selected)

  const totalRefundCents = selectedItems.reduce((acc, item) => {
    const sel = selections[item.id]!
    return acc + Math.round(item.subtotalCents * (sel.quantity / item.quantity))
  }, 0)

  async function handleConfirm() {
    setErrorMessage(null)
    try {
      const input = {
        items: selectedItems.map((item) => ({
          saleItemId: item.id,
          quantity: selections[item.id]!.quantity,
        })),
      }
      const result = await returnMutation.mutateAsync({ saleId: sale.sale.id, input })
      setSuccessMessage(`Devolución registrada. Reembolso: ${centsToArs(result.data.totalRefundCents)}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar la devolución'
      setErrorMessage(message)
    }
  }

  if (successMessage) {
    return (
      <Modal title="Devolución registrada" onClose={onClose}>
        <div className="text-center py-4">
          <p className="text-green-700 font-medium mb-6">{successMessage}</p>
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Devolución parcial — venta ${sale.sale.id.slice(0, 8)}...`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Seleccioná los ítems a devolver e indicá la cantidad.
        </p>

        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b border-gray-200">
            <tr>
              <th className="pb-2 pr-2 font-medium w-6"></th>
              <th className="pb-2 pr-2 font-medium">Producto</th>
              <th className="pb-2 pr-2 font-medium text-center">Cant.</th>
              <th className="pb-2 font-medium text-right">Reembolso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sale.items.map((item) => {
              const sel = selections[item.id]!
              const refundCents = sel.selected
                ? Math.round(item.subtotalCents * (sel.quantity / item.quantity))
                : 0
              return (
                <tr key={item.id} className="py-2">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={sel.selected}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 accent-brand-600"
                    />
                  </td>
                  <td className="py-2 pr-2 text-gray-800">{item.productName}</td>
                  <td className="py-2 pr-2 text-center">
                    {sel.selected ? (
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={sel.quantity}
                        onChange={(e) => setQuantity(item.id, Math.min(item.quantity, Math.max(1, Number(e.target.value))))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                    ) : (
                      <span className="text-gray-400">{item.quantity}</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-gray-700">
                    {sel.selected ? centsToArs(refundCents) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {selectedItems.length > 0 && (
          <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-200 pt-3">
            <span>Total a reembolsar</span>
            <span>{centsToArs(totalRefundCents)}</span>
          </div>
        )}

        {errorMessage && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={returnMutation.isPending}
            disabled={selectedItems.length === 0}
          >
            Confirmar devolución
          </Button>
        </div>
      </div>
    </Modal>
  )
}
