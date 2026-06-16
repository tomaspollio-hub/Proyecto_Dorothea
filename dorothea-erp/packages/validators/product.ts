import { z } from 'zod'

export const createProductSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(50),
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(2000).nullable().optional(),
  priceCents: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  ivaRateId: z.string().nullable().optional(),
  unit: z.enum(['unidad', 'kg', 'litro']).default('unidad'),
  minStock: z.number().int().nonnegative().default(0),
  initialStock: z.number().int().nonnegative().default(0),
})

export const updateProductSchema = createProductSchema
  .omit({ initialStock: true })
  .partial()
  .extend({
    active: z.boolean().optional(),
  })

export const productSearchSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductSearchInput = z.infer<typeof productSearchSchema>
