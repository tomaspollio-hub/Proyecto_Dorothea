import { z } from 'zod'

export const saleItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  discountCents: z.number().int().nonnegative().default(0),
})

const paymentMethods = ['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QR'] as const

export const createSaleSchema = z.object({
  customerId: z.string().nullable().optional(),
  items: z.array(saleItemInputSchema).min(1, 'La venta debe tener al menos un producto'),
  discountCents: z.number().int().nonnegative().default(0),
  paymentMethod: z.enum(paymentMethods),
  amountPaidCents: z.number().int().nonnegative(),
  notes: z.string().max(500).nullable().optional(),
})

export const saleSearchSchema = z.object({
  status: z.enum(['COMPLETED', 'CANCELLED', 'PENDING_INVOICE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export const returnSaleItemsSchema = z.object({
  items: z.array(z.object({
    saleItemId: z.string().min(1),
    quantity: z.number().int().min(1),
  })).min(1, 'Seleccioná al menos un ítem para devolver'),
})

export type SaleItemInput = z.infer<typeof saleItemInputSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type SaleSearchInput = z.infer<typeof saleSearchSchema>
export type ReturnSaleItemsInput = z.infer<typeof returnSaleItemsSchema>
