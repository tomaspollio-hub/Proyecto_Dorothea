import { useState } from 'react'
import { useCurrentSession, useSessionHistory } from '../hooks/useCashRegister.ts'
import { OpenSessionModal } from '../components/OpenSessionModal.tsx'
import { MovementFormModal } from '../components/MovementFormModal.tsx'
import { CloseSessionModal } from '../components/CloseSessionModal.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { centsToArs } from '../../../shared/utils/money.ts'

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  QR: 'QR',
}

export function CajaPage() {
  const { data, isLoading } = useCurrentSession()
  const { data: historyRes } = useSessionHistory(1)
  const [openingSession, setOpeningSession] = useState(false)
  const [addingMovement, setAddingMovement] = useState(false)
  const [closingSession, setClosingSession] = useState(false)

  if (isLoading) {
    return <div className="p-8 text-gray-400">Cargando...</div>
  }

  const current = data?.data

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
        {!current && <Button onClick={() => setOpeningSession(true)}>Abrir caja</Button>}
        {current && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAddingMovement(true)}>
              + Movimiento
            </Button>
            <Button variant="secondary" onClick={() => setClosingSession(true)}>
              Cerrar caja
            </Button>
          </div>
        )}
      </div>

      {!current && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          No hay una caja abierta. Abrí una para empezar a registrar movimientos.
        </div>
      )}

      {current && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Monto inicial</p>
              <p className="text-lg font-semibold text-gray-900">{centsToArs(current.session.openingAmountCents)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Abierta desde</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(current.session.openedAt).toLocaleString('es-AR')}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Movimientos</p>
              <p className="text-lg font-semibold text-gray-900">{current.movements.length}</p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-700 mb-2">Resumen por medio de pago</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Medio de pago</th>
                  <th className="px-4 py-3 font-medium">Ingresos</th>
                  <th className="px-4 py-3 font-medium">Egresos</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(paymentMethodLabels).map((method) => {
                  const income = current.summary.find((s) => s.paymentMethod === method && s.type === 'INCOME')?.total ?? 0
                  const expense = current.summary.find((s) => s.paymentMethod === method && s.type === 'EXPENSE')?.total ?? 0
                  if (income === 0 && expense === 0) return null
                  return (
                    <tr key={method} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-800">{paymentMethodLabels[method]}</td>
                      <td className="px-4 py-3 text-green-600">{centsToArs(income)}</td>
                      <td className="px-4 py-3 text-red-500">{centsToArs(expense)}</td>
                    </tr>
                  )
                })}
                {current.summary.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                      Sin movimientos todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="text-sm font-semibold text-gray-700 mb-2">Movimientos</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Medio</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {current.movements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      Sin movimientos todavía.
                    </td>
                  </tr>
                )}
                {current.movements.map((movement) => (
                  <tr key={movement.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(movement.createdAt).toLocaleTimeString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={movement.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}>
                        {movement.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{paymentMethodLabels[movement.paymentMethod]}</td>
                    <td className="px-4 py-3 text-gray-800">{movement.description}</td>
                    <td className="px-4 py-3 text-gray-800">{centsToArs(movement.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {historyRes && historyRes.data.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Historial de cierres</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Apertura</th>
                  <th className="px-4 py-3 font-medium">Cierre</th>
                  <th className="px-4 py-3 font-medium">Esperado</th>
                  <th className="px-4 py-3 font-medium">Declarado</th>
                  <th className="px-4 py-3 font-medium">Diferencia</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historyRes.data.map((session) => (
                  <tr key={session.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-600">{new Date(session.openedAt).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {session.closedAt ? new Date(session.closedAt).toLocaleString('es-AR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {session.expectedAmountCents !== null ? centsToArs(session.expectedAmountCents) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {session.closingAmountCents !== null ? centsToArs(session.closingAmountCents) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {session.differenceCents !== null ? (
                        <span className={session.differenceCents === 0 ? 'text-gray-600' : 'text-red-500 font-medium'}>
                          {centsToArs(session.differenceCents)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{session.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openingSession && <OpenSessionModal onClose={() => setOpeningSession(false)} />}
      {addingMovement && <MovementFormModal onClose={() => setAddingMovement(false)} />}
      {closingSession && current && (
        <CloseSessionModal
          session={current.session}
          summary={current.summary}
          onClose={() => setClosingSession(false)}
        />
      )}
    </div>
  )
}
