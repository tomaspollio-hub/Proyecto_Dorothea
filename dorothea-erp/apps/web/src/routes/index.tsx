import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../modules/users/pages/LoginPage.tsx'
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage.tsx'
import { ProductsPage } from '../modules/products/pages/ProductsPage.tsx'
import { CustomersPage } from '../modules/customers/pages/CustomersPage.tsx'
import { CajaPage } from '../modules/cash-register/pages/CajaPage.tsx'
import { VentasPage } from '../modules/sales/pages/VentasPage.tsx'
import { SettingsPage } from '../modules/settings/pages/SettingsPage.tsx'
import { UsersPage } from '../modules/users/pages/UsersPage.tsx'
import { ReportesPage } from '../modules/reports/pages/ReportesPage.tsx'
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
            element: <DashboardPage />,
          },
          {
            path: '/productos',
            element: <ProductsPage />,
          },
          {
            path: '/clientes',
            element: <CustomersPage />,
          },
          {
            path: '/caja',
            element: <CajaPage />,
          },
          {
            path: '/ventas',
            element: <VentasPage />,
          },
          {
            path: '/reportes',
            element: <ReportesPage />,
          },
          {
            path: '/configuracion',
            element: <SettingsPage />,
          },
          {
            path: '/usuarios',
            element: <UsersPage />,
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
