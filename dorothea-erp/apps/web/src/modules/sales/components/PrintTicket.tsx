import { centsToArs } from '../../../shared/utils/money.ts'
import type { SaleDetail } from '../types.ts'

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  QR: 'QR / Código QR',
}

interface PrintTicketProps {
  sale: SaleDetail
  customerName?: string | undefined
}

export function PrintTicket({ sale, customerName }: PrintTicketProps) {
  const { sale: s, items } = sale
  const date = new Date(s.createdAt)
  const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#000',
        width: '72mm',
        padding: '0',
      }}
    >
      {/* Encabezado */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>DOROTHEA</div>
        <div style={{ fontSize: '11px' }}>Tienda de Mascotas</div>
        <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>dorotheamascotas</div>
      </div>

      <Divider />

      {/* Fecha y comprobante */}
      <Row left={`${dateStr}  ${timeStr}`} right={`#${s.id.slice(0, 8)}`} />
      {customerName && <Row left="Cliente" right={customerName} />}

      <Divider />

      {/* Items */}
      <div style={{ marginBottom: '4px' }}>
        <Row left="DESCRIPCIÓN" right="IMPORTE" bold />
        {items.map((item) => (
          <div key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ flex: 1, paddingRight: '4px', wordBreak: 'break-word' }}>
                {item.quantity} x {item.productName}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>{centsToArs(item.subtotalCents)}</span>
            </div>
            {item.unitPriceCents > 0 && (
              <div style={{ fontSize: '10px', color: '#555', paddingLeft: '8px' }}>
                {centsToArs(item.unitPriceCents)} c/u
              </div>
            )}
          </div>
        ))}
      </div>

      <Divider />

      {/* Totales */}
      <Row left="Subtotal" right={centsToArs(s.subtotalCents)} />
      {s.discountCents > 0 && <Row left="Descuento" right={`-${centsToArs(s.discountCents)}`} />}
      <Row left="TOTAL" right={centsToArs(s.totalCents)} bold />

      <Divider />

      {/* Pago */}
      <Row left={paymentMethodLabels[s.paymentMethod] ?? s.paymentMethod} right={centsToArs(s.amountPaidCents)} />
      {s.changeCents > 0 && <Row left="Vuelto" right={centsToArs(s.changeCents)} />}

      <Divider />

      {/* Pie */}
      <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px' }}>
        <div>¡Gracias por su compra!</div>
        <div style={{ marginTop: '2px', fontSize: '10px', color: '#555' }}>
          Comprobante interno — no válido como factura
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
}

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: bold ? 'bold' : 'normal',
        fontSize: bold ? '13px' : '12px',
      }}
    >
      <span>{left}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{right}</span>
    </div>
  )
}
