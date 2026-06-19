import { createPortal } from 'react-dom'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { centsToArs } from '../../../shared/utils/money.ts'
import { PrintTicket } from './PrintTicket.tsx'
import type { SaleDetail } from '../types.ts'

interface ReceiptModalProps {
  sale: SaleDetail
  customerName?: string | undefined
  onClose: () => void
}

export function ReceiptModal({ sale, customerName, onClose }: ReceiptModalProps) {
  function handlePrint() {
    window.print()
  }

  const printRoot = document.getElementById('print-root')

  return (
    <>
      <Modal title="Venta confirmada" onClose={onClose}>
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-gray-500">
            Comprobante interno #{sale.sale.id.slice(0, 8)} —{' '}
            {new Date(sale.sale.createdAt).toLocaleString('es-AR')}
          </p>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between px-3 py-2">
                <span>
                  {item.quantity} x {item.productName}
                </span>
                <span>{centsToArs(item.subtotalCents)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1 px-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{centsToArs(sale.sale.subtotalCents)}</span>
            </div>
            {sale.sale.discountCents > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Descuento</span>
                <span>-{centsToArs(sale.sale.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base">
              <span>Total</span>
              <span>{centsToArs(sale.sale.totalCents)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Pagado</span>
              <span>{centsToArs(sale.sale.amountPaidCents)}</span>
            </div>
            {sale.sale.changeCents > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Vuelto</span>
                <span>{centsToArs(sale.sale.changeCents)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <Button variant="secondary" onClick={handlePrint} className="flex-1">
              Imprimir ticket
            </Button>
            <Button onClick={onClose} className="flex-1">
              Nueva venta
            </Button>
          </div>
        </div>
      </Modal>

      {printRoot &&
        createPortal(<PrintTicket sale={sale} customerName={customerName} />, printRoot)}
    </>
  )
}
