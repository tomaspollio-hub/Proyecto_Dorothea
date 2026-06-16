import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mercadoPagoConfigSchema, type MercadoPagoConfigInput } from '@dorothea/validators/integrations'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useMercadoPagoConfig, useSetMercadoPagoConfig } from '../hooks/useIntegrations.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'

export function MercadoPagoConfigForm() {
  const { data, isLoading } = useMercadoPagoConfig()
  const setConfig = useSetMercadoPagoConfig()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MercadoPagoConfigInput>({
    resolver: zodResolver(mercadoPagoConfigSchema),
    defaultValues: { environment: 'sandbox' },
  })

  async function onSubmit(values: MercadoPagoConfigInput) {
    setSuccess(false)
    try {
      await setConfig.mutateAsync(values)
      setSuccess(true)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al guardar la configuración'
      setError('root', { message })
    }
  }

  const status = data?.data

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Mercado Pago (pasarela de pagos)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Credenciales de la cuenta de Mercado Pago de Dorothea. Se van a usar cuando se active el cobro
        online (no implementado todavía) — el cliente las entrega cuando esté listo para activarlo.
      </p>

      {!isLoading && (
        <p className="text-sm mb-4">
          Estado:{' '}
          {status?.configured ? (
            <span className="text-green-600 font-medium">Configurado ({status.environment})</span>
          ) : (
            <span className="text-gray-400">Sin configurar</span>
          )}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Access token" error={errors.accessToken?.message} {...register('accessToken')} />
        <Input label="Public key" error={errors.publicKey?.message} {...register('publicKey')} />
        <Input
          label="Webhook secret (opcional)"
          error={errors.webhookSecret?.message}
          {...register('webhookSecret')}
        />

        <div className="flex flex-col gap-1 max-w-xs">
          <label className="text-sm font-medium text-gray-700">Ambiente</label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            {...register('environment')}
          >
            <option value="sandbox">Sandbox (pruebas)</option>
            <option value="produccion">Producción</option>
          </select>
        </div>

        {errors.root && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors.root.message}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Configuración guardada.
          </div>
        )}

        <div>
          <Button type="submit" isLoading={isSubmitting}>
            Guardar configuración Mercado Pago
          </Button>
        </div>
      </form>
    </div>
  )
}
