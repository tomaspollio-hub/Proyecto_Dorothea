import { useState } from 'react'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useResetUserPassword } from '../hooks/useUsers.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'
import type { ManagedUser } from '../types.ts'

interface ResetPasswordModalProps {
  user: ManagedUser
  onClose: () => void
}

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const resetPassword = useResetUserPassword()
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    try {
      await resetPassword.mutateAsync({ id: user.id, newPassword })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al resetear la contraseña')
    }
  }

  return (
    <Modal title={`Resetear contraseña — ${user.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Input
          label="Contraseña nueva"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={resetPassword.isPending}>
            Resetear
          </Button>
        </div>
      </div>
    </Modal>
  )
}
