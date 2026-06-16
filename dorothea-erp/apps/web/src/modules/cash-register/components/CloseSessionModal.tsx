import { useForm } from 'react-hook-form'
import { closeSessionSchema, type CloseSessionInput } from '@dorothea/validators/cash-register'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useCloseSession } from '../hooks/useCashRegister.ts'
import { arsToCents, centsToArs } from '../../../shared/utils/money.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'
import type { CashRegisterSession, PaymentMethodSummaryRow } from '../types.ts'

interface CloseSessionModalProps {
  session: CashRegisterSession
  summary: PaymentMethodSummaryRow[]
  onClose: () => void
}

interface FormValues {
  closingAmountArs: number
  notes?: string
}

export function CloseSessionModal({ session, summary, onClose }: CloseSessionModalProps) {
  const closeSession = useCloseSession()

  const cashIncome = summary.find((s) => s.paymentMethod === 'CASH' && s.type === 'INCOME')?.total ?? 0
  const cashExpense = summary.find((s) => s.paymentMethod === 'CASH' && s.type === 'EXPENSE')?.total ?? 0
  const expectedCents = session.openingAmountCents + cashIncome - cashExpense

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    try {
      const input: CloseSessionInput = closeSessionSchema.parse({
        closingAmountCents: arsToCents(Number(values.closingAmountArs)),
        notes: values.notes || null,
      })
      await closeSession.mutateAsync(input)
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al cerrar la caja'
      setError('root', { message })
    }
  }

  return (
    <Modal title="Cerrar caja" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">
        Monto esperado en efectivo: <span className="font-semibold text-gray-800">{centsToArs(expectedCents)}</span>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Monto contado (ARS)"
          type="number"
          step="0.01"
          error={errors.closingAmountArs?.message}
          {...register('closingAmountArs', { required: 'Requerido', valueAsNumber: true })}
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
            Confirmar cierre
          </Button>
        </div>
      </form>
    </Modal>
  )
}
