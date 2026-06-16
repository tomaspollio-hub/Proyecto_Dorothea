import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { openSessionSchema, type OpenSessionInput } from '@dorothea/validators/cash-register'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useOpenSession } from '../hooks/useCashRegister.ts'
import { arsToCents } from '../../../shared/utils/money.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'

interface OpenSessionModalProps {
  onClose: () => void
}

interface FormValues {
  openingAmountArs: number
  notes?: string
}

export function OpenSessionModal({ onClose }: OpenSessionModalProps) {
  const openSession = useOpenSession()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    try {
      const input: OpenSessionInput = openSessionSchema.parse({
        openingAmountCents: arsToCents(Number(values.openingAmountArs)),
        notes: values.notes || null,
      })
      await openSession.mutateAsync(input)
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al abrir la caja'
      setError('root', { message })
    }
  }

  return (
    <Modal title="Abrir caja" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Monto inicial (ARS)"
          type="number"
          step="0.01"
          error={errors.openingAmountArs?.message}
          {...register('openingAmountArs', { required: 'Requerido', valueAsNumber: true })}
        />

        <Input label="Notas" error={errors.notes?.message} {...register('notes')} />

        {errors.root && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors.root.message}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Abrir caja
          </Button>
        </div>
      </form>
    </Modal>
  )
}
