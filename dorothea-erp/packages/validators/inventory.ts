import { z } from 'zod'

export const adjustStockSchema = z.object({
  quantityChange: z.number().int().refine((n) => n !== 0, 'El ajuste no puede ser cero'),
  notes: z.string().min(1, 'El motivo es requerido').max(500),
})

export type AdjustStockInput = z.infer<typeof adjustStockSchema>
