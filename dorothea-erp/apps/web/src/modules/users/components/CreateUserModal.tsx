import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, type CreateUserInput } from '@dorothea/validators/user'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useCreateUser } from '../hooks/useUsers.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'

interface CreateUserModalProps {
  onClose: () => void
}

export function CreateUserModal({ onClose }: CreateUserModalProps) {
  const createUser = useCreateUser()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'cashier' },
  })

  async function onSubmit(values: CreateUserInput) {
    try {
      await createUser.mutateAsync(values)
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al crear el usuario'
      setError('root', { message })
    }
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nombre" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Contraseña inicial"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Rol</label>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" {...register('role')}>
            <option value="cashier">Cajero</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

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
            Crear usuario
          </Button>
        </div>
      </form>
    </Modal>
  )
}
