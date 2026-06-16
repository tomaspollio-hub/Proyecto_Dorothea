import { useState } from 'react'
import { useUsers, useUpdateUser } from '../hooks/useUsers.ts'
import { CreateUserModal } from '../components/CreateUserModal.tsx'
import { ResetPasswordModal } from '../components/ResetPasswordModal.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useAuth } from '../../../shared/hooks/useAuth.ts'
import type { ManagedUser } from '../types.ts'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  cashier: 'Cajero',
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const { data, isLoading } = useUsers()
  const updateUser = useUpdateUser()
  const [creating, setCreating] = useState(false)
  const [resettingPassword, setResettingPassword] = useState<ManagedUser | null>(null)

  async function toggleActive(user: ManagedUser) {
    if (user.isActive && !confirm(`¿Desactivar a "${user.name}"? No va a poder iniciar sesión.`)) return
    await updateUser.mutateAsync({ id: user.id, input: { isActive: !user.isActive } })
  }

  async function changeRole(user: ManagedUser, role: ManagedUser['role']) {
    await updateUser.mutateAsync({ id: user.id, input: { role } })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <Button onClick={() => setCreating(true)}>+ Nuevo usuario</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {data?.data.map((user) => {
              const isSelf = user.id === currentUser?.id
              return (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.name} {isSelf && <span className="text-xs text-gray-400">(vos)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="px-2 py-1 border border-gray-300 rounded text-sm bg-white disabled:opacity-50"
                      value={user.role}
                      disabled={isSelf}
                      onChange={(e) => changeRole(user, e.target.value as ManagedUser['role'])}
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={user.isActive ? 'text-green-600' : 'text-gray-400'}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setResettingPassword(user)}
                      className="text-brand-600 hover:underline text-xs"
                    >
                      Resetear contraseña
                    </button>
                    {!isSelf && (
                      <button
                        onClick={() => toggleActive(user)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
      {resettingPassword && (
        <ResetPasswordModal user={resettingPassword} onClose={() => setResettingPassword(null)} />
      )}
    </div>
  )
}
