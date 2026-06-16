export interface ManagedUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'cashier' | 'supervisor'
  isActive: boolean
  createdAt?: string
}
