import { z } from 'zod'

const roles = ['admin', 'cashier', 'supervisor'] as const

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(200),
  role: z.enum(roles).default('cashier'),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(roles).optional(),
  isActive: z.boolean().optional(),
})

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
