import { z } from 'zod'

const CUIT_MULTIPLIERS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

export function isValidCuit(rawCuit: string): boolean {
  const digits = rawCuit.replace(/\D/g, '')
  if (digits.length !== 11) return false

  const sum = CUIT_MULTIPLIERS.reduce((acc, multiplier, i) => acc + multiplier * Number(digits[i]), 0)
  const mod = sum % 11
  let verifier = 11 - mod
  if (verifier === 11) verifier = 0
  if (verifier === 10) return false

  return verifier === Number(digits[10])
}

const fiscalConditions = ['RI', 'Monotributo', 'Exento', 'Consumidor Final'] as const

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  cuit: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .refine((value) => !value || isValidCuit(value), 'CUIT inválido'),
  fiscalCondition: z.enum(fiscalConditions).default('Consumidor Final'),
  email: z.string().email('Email inválido').nullable().optional().or(z.literal('')),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  petsNotes: z.string().max(1000).nullable().optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  active: z.boolean().optional(),
})

export const customerSearchSchema = z.object({
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerSearchInput = z.infer<typeof customerSearchSchema>
