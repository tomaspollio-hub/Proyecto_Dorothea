import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCustomerSchema, type CreateCustomerInput } from '@dorothea/validators/customer'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomers.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'
import type { Customer } from '../types.ts'

interface CustomerFormModalProps {
  customer?: Customer
  onClose: () => void
}

export function CustomerFormModal({ customer, onClose }: CustomerFormModalProps) {
  const isEdit = !!customer
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          cuit: customer.cuit ?? '',
          fiscalCondition: customer.fiscalCondition,
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          address: customer.address ?? '',
          petsNotes: customer.petsNotes ?? '',
        }
      : { fiscalCondition: 'Consumidor Final' },
  })

  async function onSubmit(values: CreateCustomerInput) {
    try {
      if (isEdit && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, input: values })
      } else {
        await createCustomer.mutateAsync(values)
      }
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al guardar el cliente'
      setError('root', { message })
    }
  }

  return (
    <Modal title={isEdit ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nombre" error={errors.name?.message} {...register('name')} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="CUIT" placeholder="30-50000091-7" error={errors.cuit?.message} {...register('cuit')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Condición fiscal</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('fiscalCondition')}
            >
              <option value="Consumidor Final">Consumidor Final</option>
              <option value="RI">Responsable Inscripto</option>
              <option value="Monotributo">Monotributo</option>
              <option value="Exento">Exento</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Teléfono" error={errors.phone?.message} {...register('phone')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        </div>

        <Input label="Dirección" error={errors.address?.message} {...register('address')} />
        <Input label="Mascotas (notas)" error={errors.petsNotes?.message} {...register('petsNotes')} />

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
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
