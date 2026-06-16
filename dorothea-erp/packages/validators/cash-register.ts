import { z } from 'zod'

export const openSessionSchema = z.object({
  openingAmountCents: z.number().int().nonnegative(),
  notes: z.string().max(500).nullable().optional(),
})

export const closeSessionSchema = z.object({
  closingAmountCents: z.number().int().nonnegative(),
  notes: z.string().max(500).nullable().optional(),
})

const paymentMethods = ['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QR'] as const

export const createMovementSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amountCents: z.number().int().positive(),
  paymentMethod: z.enum(paymentMethods),
  description: z.string().min(1, 'La descripción es requerida').max(500),
})

export type OpenSessionInput = z.infer<typeof openSessionSchema>
export type CloseSessionInput = z.infer<typeof closeSessionSchema>
export type CreateMovementInput = z.infer<typeof createMovementSchema>
