import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { changePasswordSchema, type ChangePasswordInput } from '@dorothea/validators/auth'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { authApi } from '../api/auth.api.ts'
import { useAuth } from '../../../shared/hooks/useAuth.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'

interface ChangePasswordModalProps {
  onClose: () => void
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await authApi.changePassword(values)
      await logout()
      navigate('/login')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al cambiar la contraseña'
      setError('root', { message })
    }
  }

  return (
    <Modal title="Cambiar contraseña" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Contraseña actual"
          type="password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label="Contraseña nueva"
          type="password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
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
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  )
}
