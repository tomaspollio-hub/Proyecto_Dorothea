import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../api/products.api.ts'
import { categoriesApi } from '../api/categories.api.ts'
import type { CreateProductInput, UpdateProductInput } from '@dorothea/validators/product'
import type { CreateCategoryInput } from '@dorothea/validators/category'
import type { AdjustStockInput } from '@dorothea/validators/inventory'
import type { ProductListParams } from '../types.ts'

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params),
  })
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })
}

export function useLowStock() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => productsApi.lowStock(),
  })
}

export function useProductMovements(id: string | null) {
  return useQuery({
    queryKey: ['products', id, 'movements'],
    queryFn: () => productsApi.movements(id!),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => productsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUploadProductImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => productsApi.uploadImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustStockInput }) => productsApi.adjustStock(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', variables.id, 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] })
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => categoriesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
