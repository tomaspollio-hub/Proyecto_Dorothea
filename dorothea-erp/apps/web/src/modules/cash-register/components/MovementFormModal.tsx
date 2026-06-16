import { useForm } from 'react-hook-form'
import { createMovementSchema, type CreateMovementInput } from '@dorothea/validators/cash-register'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useCreateMovement } from '../hooks/useCashRegister.ts'
import { arsToCents } from '../../../shared/utils/money.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'

interface MovementFormModalProps {
  onClose: () => void
}

interface FormValues {
  type: 'INCOME' | 'EXPENSE'
  amountArs: number
  paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'QR'
  description: string
}

export function MovementFormModal({ onClose }: MovementFormModalProps) {
  const createMovement = useCreateMovement()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { type: 'INCOME', paymentMethod: 'CASH' } })

  async function onSubmit(values: FormValues) {
    try {
      const input: CreateMovementInput = createMovementSchema.parse({
        type: values.type,
        amountCents: arsToCents(Number(values.amountArs)),
        paymentMethod: values.paymentMethod,
        description: values.description,
      })
      await createMovement.mutateAsync(input)
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al registrar el movimiento'
      setError('root', { message })
    }
  }

  return (
    <Modal title="Nuevo movimiento" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('type')}
            >
              <option value="INCOME">Ingreso</option>
              <option value="EXPENSE">Egreso</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Medio de pago</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('paymentMethod')}
            >
              <option value="CASH">Efectivo</option>
              <option value="DEBIT">Débito</option>
              <option value="CREDIT">Crédito</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="QR">QR</option>
            </select>
          </div>
        </div>

        <Input
          label="Monto (ARS)"
          type="number"
          step="0.01"
          error={errors.amountArs?.message}
          {...register('amountArs', { required: 'Requerido', valueAsNumber: true })}
        />

        <Input
          label="Descripción"
          error={errors.description?.message}
          {...register('description', { required: 'Requerido' })}
        />

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
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
