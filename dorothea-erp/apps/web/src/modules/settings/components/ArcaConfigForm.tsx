import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { arcaConfigSchema, type ArcaConfigInput } from '@dorothea/validators/integrations'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useArcaConfig, useSetArcaConfig } from '../hooks/useIntegrations.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'

export function ArcaConfigForm() {
  const { data, isLoading } = useArcaConfig()
  const setConfig = useSetArcaConfig()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ArcaConfigInput>({
    resolver: zodResolver(arcaConfigSchema),
    defaultValues: { environment: 'homologacion' },
  })

  async function onSubmit(values: ArcaConfigInput) {
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
      <h2 className="text-lg font-semibold text-gray-800 mb-1">ARCA (Facturación electrónica)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Credenciales del Web Service de ARCA (ex-AFIP). Se van a usar cuando se active el módulo de
        Facturación — el cliente las entrega una vez que el proyecto esté presentado.
      </p>

      {!isLoading && (
        <p className="text-sm mb-4">
          Estado:{' '}
          {status?.configured ? (
            <span className="text-green-600 font-medium">
              Configurado (CUIT {status.cuit}, {status.environment})
            </span>
          ) : (
            <span className="text-gray-400">Sin configurar</span>
          )}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="CUIT (sin guiones)" error={errors.cuit?.message} {...register('cuit')} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Certificado (PEM)</label>
          <textarea
            rows={4}
            placeholder="-----BEGIN CERTIFICATE-----"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('certPem')}
          />
          {errors.certPem && <p className="text-xs text-red-600">{errors.certPem.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Clave privada (PEM)</label>
          <textarea
            rows={4}
            placeholder="-----BEGIN RSA PRIVATE KEY-----"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('privateKeyPem')}
          />
          {errors.privateKeyPem && <p className="text-xs text-red-600">{errors.privateKeyPem.message}</p>}
        </div>

        <div className="flex flex-col gap-1 max-w-xs">
          <label className="text-sm font-medium text-gray-700">Ambiente</label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            {...register('environment')}
          >
            <option value="homologacion">Homologación (pruebas)</option>
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
            Guardar configuración ARCA
          </Button>
        </div>
      </form>
    </div>
  )
}
