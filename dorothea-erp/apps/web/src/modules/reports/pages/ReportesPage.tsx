import { useState } from 'react'
import { useReports } from '../hooks/useReports.ts'
import { centsToArs } from '../../../shared/utils/money.ts'
import type { SalesReport } from '../types.ts'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  QR: 'QR',
}

function getMonthRange() {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const to = now.toISOString().slice(0, 10)
  return { from, to }
}

function getPrevMonthRange() {
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1)
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1)
  return {
    from: firstOfPrevMonth.toISOString().slice(0, 10),
    to: lastOfPrevMonth.toISOString().slice(0, 10),
  }
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Monday = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek)
  return {
    from: monday.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  }
}

function getTodayRange() {
  const today = new Date().toISOString().slice(0, 10)
  return { from: today, to: today }
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function SalesChart({ days }: { days: SalesReport['byDay'] }) {
  const max = Math.max(...days.map((d) => d.totalCents), 1)

  if (days.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas por día</h2>
        <p className="text-sm text-gray-400">Sin ventas en este período.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas por día</h2>
      <div className="flex items-end gap-1 h-40 overflow-x-auto">
        {days.map((d) => (
          <div key={d.day} className="flex-1 min-w-[32px] flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400 whitespace-nowrap">{centsToArs(d.totalCents)}</span>
            <div
              className="w-full rounded-t bg-brand-500 transition-all"
              style={{ height: `${Math.max((d.totalCents / max) * 112, d.totalCents > 0 ? 4 : 0)}px` }}
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">{d.day.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function exportCsv(byDay: SalesReport['byDay']) {
  const rows = [
    ['Fecha', 'Cantidad', 'Total (ARS)'],
    ...byDay.map((d) => [d.day, String(d.count), (d.totalCents / 100).toFixed(2)]),
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reporte-ventas.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportesPage() {
  const thisMonth = getMonthRange()
  const [from, setFrom] = useState(thisMonth.from)
  const [to, setTo] = useState(thisMonth.to)

  const { data, isLoading, isError } = useReports(from, to)

  function applyPreset(preset: { from: string; to: string }) {
    setFrom(preset.from)
    setTo(preset.to)
  }

  const presets = [
    { label: 'Hoy', range: getTodayRange() },
    { label: 'Esta semana', range: getWeekRange() },
    { label: 'Este mes', range: getMonthRange() },
    { label: 'Mes anterior', range: getPrevMonthRange() },
  ]

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reportes de ventas</h1>
        {data && (
          <button
            onClick={() => exportCsv(data.byDay)}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
          >
            Exportar CSV
          </button>
        )}
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Período:</span>
          <div className="flex gap-2 flex-wrap">
            {presets.map((p) => {
              const isActive = from === p.range.from && to === p.range.to
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-500">Desde</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <label className="text-sm text-gray-500">Hasta</label>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-56 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">No se pudo cargar el reporte. Intentá de nuevo.</p>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total vendido"
              value={centsToArs(data.summary.totalCents)}
              sub={`${data.summary.count} ventas`}
            />
            <KpiCard
              label="Nro de ventas"
              value={String(data.summary.count)}
              sub="Ventas completadas"
            />
            <KpiCard
              label="Ticket promedio"
              value={data.summary.avgTicketCents > 0 ? centsToArs(data.summary.avgTicketCents) : '—'}
              sub="Por venta"
            />
          </div>

          {/* Bar chart by day */}
          <SalesChart days={data.byDay} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Payment methods table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Medios de pago</h2>
              {data.byPaymentMethod.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos para este período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">Medio</th>
                      <th className="pb-2 font-medium text-right">Ventas</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.byPaymentMethod.map((row) => (
                      <tr key={row.paymentMethod}>
                        <td className="py-2.5 text-gray-700 font-medium">
                          {PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}
                        </td>
                        <td className="py-2.5 text-right text-gray-500">{row.count}</td>
                        <td className="py-2.5 text-right text-gray-900 font-medium">
                          {centsToArs(row.totalCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top 10 products */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Top 10 productos</h2>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos para este período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium w-6">#</th>
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium text-right">Uds.</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topProducts.map((p, i) => (
                      <tr key={p.productName}>
                        <td className="py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2.5 text-gray-800">{p.productName}</td>
                        <td className="py-2.5 text-right text-gray-500">{p.totalQuantity}</td>
                        <td className="py-2.5 text-right text-gray-900 font-medium">
                          {centsToArs(p.totalCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
