import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from '@dorothea/validators/auth'
import { useAuth } from '../../../shared/hooks/useAuth.ts'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { ApiError } from '../../../shared/utils/api-client.ts'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch (err) {
      const message = err instanceof ApiError && err.status === 401
        ? 'Email o contraseña incorrectos'
        : 'Error al iniciar sesión. Intentá de nuevo.'
      setError('root', { message })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dorothea ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Pet Shop Management System</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {errors.root && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dorothea Pet Shop &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
