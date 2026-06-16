import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage.tsx'
import { ApiError } from '../../../shared/utils/api-client.ts'

const loginMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../../shared/hooks/useAuth.ts', () => ({
  useAuth: () => ({ login: loginMock }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset()
    navigateMock.mockReset()
  })

  it('muestra errores de validación si se envía vacío', async () => {
    renderLoginPage()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('llama a login y navega al dashboard si las credenciales son correctas', async () => {
    loginMock.mockResolvedValueOnce(undefined)
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@dorothea.com.ar')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'dorothea2024')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('admin@dorothea.com.ar', 'dorothea2024'))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('muestra "Email o contraseña incorrectos" en un 401', async () => {
    loginMock.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Credenciales inválidas'))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@dorothea.com.ar')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Email o contraseña incorrectos')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('muestra un error genérico si el servidor falla', async () => {
    loginMock.mockRejectedValueOnce(new Error('network down'))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@dorothea.com.ar')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'dorothea2024')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Error al iniciar sesión. Intentá de nuevo.')).toBeInTheDocument()
  })
})
