import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  parentId: z.string().nullable().optional(),
})

export const updateCategorySchema = createCategorySchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
