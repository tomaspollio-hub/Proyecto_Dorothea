import { ArcaConfigForm } from '../components/ArcaConfigForm.tsx'
import { MercadoPagoConfigForm } from '../components/MercadoPagoConfigForm.tsx'

export function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración</h1>

      <div className="flex flex-col gap-6">
        <ArcaConfigForm />
        <MercadoPagoConfigForm />
      </div>
    </div>
  )
}
