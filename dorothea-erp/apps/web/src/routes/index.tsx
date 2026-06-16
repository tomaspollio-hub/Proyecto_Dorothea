import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../modules/users/pages/LoginPage.tsx'
import { ProductsPage } from '../modules/products/pages/ProductsPage.tsx'
import { AppLayout } from '../shared/components/layout/AppLayout.tsx'
import { ProtectedRoute } from './ProtectedRoute.tsx'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <div className="p-8"><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500 mt-2">Bienvenido a Dorothea ERP.</p></div>,
          },
          {
            path: '/productos',
            element: <ProductsPage />,
          },
          // Las rutas de cada módulo se agregan aquí en las próximas fases
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" />,
  },
])
