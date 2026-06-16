import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adjustStockSchema, type AdjustStockInput } from '@dorothea/validators/inventory'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useAdjustStock } from '../hooks/useProducts.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'
import type { ProductListItem } from '../types.ts'

interface StockAdjustModalProps {
  product: ProductListItem
  onClose: () => void
}

export function StockAdjustModal({ product, onClose }: StockAdjustModalProps) {
  const adjustStock = useAdjustStock()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdjustStockInput>({
    resolver: zodResolver(adjustStockSchema),
  })

  async function onSubmit(values: AdjustStockInput) {
    try {
      await adjustStock.mutateAsync({ id: product.id, input: values })
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al ajustar el stock'
      setError('root', { message })
    }
  }

  return (
    <Modal title={`Ajustar stock — ${product.name}`} onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">Stock actual: {product.quantity ?? 0}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Cantidad (positivo suma, negativo resta)"
          type="number"
          error={errors.quantityChange?.message}
          {...register('quantityChange', { valueAsNumber: true })}
        />

        <Input label="Motivo" error={errors.notes?.message} {...register('notes')} />

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
            Confirmar ajuste
          </Button>
        </div>
      </form>
    </Modal>
  )
}
