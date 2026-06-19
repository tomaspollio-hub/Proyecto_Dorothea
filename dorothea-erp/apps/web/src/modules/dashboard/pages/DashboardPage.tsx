import { useDashboard } from '../hooks/useDashboard.ts'
import { centsToArs } from '../../../shared/utils/money.ts'

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function SalesChart({ days }: { days: Array<{ day: string; totalCents: number; count: number }> }) {
  const filled = buildLast7Days(days)
  const max = Math.max(...filled.map((d) => d.totalCents), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas — últimos 7 días</h2>
      <div className="flex items-end gap-2 h-32">
        {filled.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">{centsToArs(d.totalCents)}</span>
            <div
              className="w-full rounded-t bg-brand-500 transition-all"
              style={{ height: `${Math.max((d.totalCents / max) * 96, d.totalCents > 0 ? 4 : 0)}px` }}
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">{formatDay(d.day)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildLast7Days(data: Array<{ day: string; totalCents: number; count: number }>) {
  const map = new Map(data.map((d) => [d.day, d]))
  const result = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const key = date.toISOString().slice(0, 10)
    result.push(map.get(key) ?? { day: key, totalCents: 0, count: 0 })
  }
  return result
}

function formatDay(iso: string) {
  const [, , d] = iso.split('-')
  const date = new Date(iso + 'T12:00:00')
  return `${date.toLocaleDateString('es-AR', { weekday: 'short' })} ${d}`
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <p className="text-red-600 text-sm">No se pudo cargar el dashboard.</p>
      </div>
    )
  }

  const { today, salesLast7Days, topProducts, lowStock, cashRegister } = data

  const cajaValue =
    cashRegister.status === 'OPEN'
      ? cashRegister.estimatedCashCents !== null
        ? centsToArs(cashRegister.estimatedCashCents)
        : 'Abierta'
      : 'Cerrada'

  const cajaSub =
    cashRegister.status === 'OPEN'
      ? `Abierta · ${new Date(cashRegister.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
      : 'Sin sesión activa'

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Ventas hoy" value={centsToArs(today.totalCents)} sub={`${today.count} transacciones`} />
        <KpiCard
          label="Ticket promedio"
          value={today.avgTicketCents > 0 ? centsToArs(today.avgTicketCents) : '—'}
          sub="Hoy"
        />
        <KpiCard label="Transacciones hoy" value={String(today.count)} sub="Ventas completadas" />
        <KpiCard label="Caja" value={cajaValue} sub={cajaSub} />
      </div>

      <SalesChart days={salesLast7Days} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top productos — últimos 30 días</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">Sin ventas en este período.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const max = topProducts[0]?.totalQuantity ?? 1
                return (
                  <div key={p.productName}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">
                        <span className="text-gray-400 mr-2">#{i + 1}</span>
                        {p.productName}
                      </span>
                      <span className="text-gray-500">
                        {p.totalQuantity} u · {centsToArs(p.totalCents)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded-full"
                        style={{ width: `${(p.totalQuantity / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Stock bajo mínimo
            {lowStock.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                {lowStock.length}
              </span>
            )}
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-400 mt-4">Todo el stock está por encima del mínimo.</p>
          ) : (
            <div className="mt-3 divide-y divide-gray-100">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-800">{p.name}</span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold ${p.quantity === 0 ? 'text-red-600' : 'text-orange-500'}`}
                    >
                      {p.quantity} u
                    </span>
                    <span className="text-xs text-gray-400 ml-1">/ mín {p.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
