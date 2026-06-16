import { api } from '../../../shared/utils/api-client.ts'
import type { CreateCategoryInput } from '@dorothea/validators/category'
import type { Category } from '../types.ts'

export const categoriesApi = {
  list: () => api.get<{ data: Category[] }>('/categories'),
  create: (input: CreateCategoryInput) => api.post<{ data: Category }>('/categories', input),
}
