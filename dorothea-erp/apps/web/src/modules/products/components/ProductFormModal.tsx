import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../shared/components/ui/Modal.tsx'
import { Input } from '../../../shared/components/ui/Input.tsx'
import { Button } from '../../../shared/components/ui/Button.tsx'
import { useCategories, useCreateProduct, useUpdateProduct, useUploadProductImage } from '../hooks/useProducts.ts'
import { arsToCents } from '../../../shared/utils/money.ts'
import { ApiError } from '../../../shared/utils/api-client.ts'
import type { ProductListItem } from '../types.ts'

const productFormSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(50),
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(2000).optional(),
  priceArs: z.coerce.number().nonnegative('El precio no puede ser negativo'),
  costArs: z.coerce.number().nonnegative().optional(),
  categoryId: z.string().optional(),
  unit: z.enum(['unidad', 'kg', 'litro']),
  minStock: z.coerce.number().int().nonnegative(),
  initialStock: z.coerce.number().int().nonnegative().optional(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface ProductFormModalProps {
  product?: ProductListItem
  onClose: () => void
}

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const isEdit = !!product
  const { data: categoriesRes } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const uploadImage = useUploadProductImage()
  const [imageFile, setImageFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          code: product.code,
          name: product.name,
          description: product.description ?? '',
          priceArs: product.priceCents / 100,
          costArs: product.costCents ? product.costCents / 100 : undefined,
          categoryId: product.categoryId ?? '',
          unit: product.unit,
          minStock: product.minStock,
        }
      : { unit: 'unidad', minStock: 0, initialStock: 0 },
  })

  async function onSubmit(values: ProductFormValues) {
    try {
      let productId = product?.id

      if (isEdit && product) {
        await updateProduct.mutateAsync({
          id: product.id,
          input: {
            code: values.code,
            name: values.name,
            description: values.description || null,
            priceCents: arsToCents(values.priceArs),
            costCents: values.costArs ? arsToCents(values.costArs) : null,
            categoryId: values.categoryId || null,
            unit: values.unit,
            minStock: values.minStock,
          },
        })
      } else {
        const created = await createProduct.mutateAsync({
          code: values.code,
          name: values.name,
          description: values.description || null,
          priceCents: arsToCents(values.priceArs),
          costCents: values.costArs ? arsToCents(values.costArs) : null,
          categoryId: values.categoryId || null,
          unit: values.unit,
          minStock: values.minStock,
          initialStock: values.initialStock ?? 0,
        })
        productId = created.data.id
      }

      if (imageFile && productId) {
        await uploadImage.mutateAsync({ id: productId, file: imageFile })
      }

      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al guardar el producto'
      setError('root', { message })
    }
  }

  return (
    <Modal title={isEdit ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Código" error={errors.code?.message} {...register('code')} />
          <Input label="Nombre" error={errors.name?.message} {...register('name')} />
        </div>

        <Input label="Descripción" error={errors.description?.message} {...register('description')} />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Precio de venta (ARS)"
            type="number"
            step="0.01"
            error={errors.priceArs?.message}
            {...register('priceArs')}
          />
          <Input
            label="Costo (ARS)"
            type="number"
            step="0.01"
            error={errors.costArs?.message}
            {...register('costArs')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('categoryId')}
            >
              <option value="">Sin categoría</option>
              {categoriesRes?.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Unidad</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('unit')}
            >
              <option value="unidad">Unidad</option>
              <option value="kg">Kg</option>
              <option value="litro">Litro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Stock mínimo"
            type="number"
            error={errors.minStock?.message}
            {...register('minStock')}
          />
          {!isEdit && (
            <Input
              label="Stock inicial"
              type="number"
              error={errors.initialStock?.message}
              {...register('initialStock')}
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Imagen</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        {errors.root && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors.root.message}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
