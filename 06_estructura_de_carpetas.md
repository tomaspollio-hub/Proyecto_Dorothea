# Estructura de Carpetas del Proyecto — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## Estructura Raíz del Repositorio

```
dorothea-erp/
│
├── .github/
│   └── workflows/
│       ├── deploy-pages.yml        # Deploy frontend a Cloudflare Pages
│       ├── deploy-worker.yml       # Deploy worker a Cloudflare Workers
│       └── ci.yml                  # Tests en cada PR
│
├── apps/
│   ├── web/                        # Frontend React
│   └── worker/                     # Backend Cloudflare Worker
│
├── packages/
│   ├── db/                         # Schema D1 + migraciones + Drizzle
│   ├── shared/                     # Tipos TypeScript compartidos
│   └── validators/                 # Schemas Zod compartidos
│
├── scripts/
│   ├── migrate.ts                  # Ejecuta migraciones D1
│   ├── seed.ts                     # Datos iniciales para dev
│   └── import-legacy.ts            # Importación desde sistema Pascal
│
├── docs/
│   ├── architecture/               # Esta documentación
│   ├── api/                        # Documentación de endpoints
│   └── user/                       # Manual de usuario
│
├── .env.example                    # Variables de entorno documentadas
├── package.json                    # Workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
├── tsconfig.base.json              # TypeScript config base
└── wrangler.toml                   # Configuración Cloudflare Workers
```

---

## apps/web — Frontend React

```
apps/web/
│
├── public/
│   ├── favicon.ico
│   └── manifest.json               # Para futura PWA
│
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Router principal
│   │
│   ├── modules/                    # Un directorio por módulo de negocio
│   │   ├── pos/                    # Módulo Ventas / POS
│   │   │   ├── components/
│   │   │   │   ├── ProductSearch.tsx
│   │   │   │   ├── Cart.tsx
│   │   │   │   ├── CartItem.tsx
│   │   │   │   ├── PaymentModal.tsx
│   │   │   │   └── ReceiptView.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCart.ts
│   │   │   │   └── useProductSearch.ts
│   │   │   ├── stores/
│   │   │   │   └── cartStore.ts    # Zustand store del carrito
│   │   │   └── pages/
│   │   │       └── POSPage.tsx
│   │   │
│   │   ├── products/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   │       ├── ProductListPage.tsx
│   │   │       ├── ProductFormPage.tsx
│   │   │       └── ProductDetailPage.tsx
│   │   │
│   │   ├── inventory/              # Módulo Stock
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── customers/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── cash-register/          # Módulo Caja
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── invoices/               # Módulo Facturación ARCA
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── purchases/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── suppliers/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── pets/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── reports/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   └── users/
│   │       ├── components/
│   │       └── pages/
│   │
│   ├── shared/                     # Componentes y utilidades compartidas
│   │   ├── components/
│   │   │   ├── ui/                 # Componentes base (Button, Input, Modal, etc.)
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useApi.ts           # Wrapper de TanStack Query
│   │   │   ├── useAuth.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── currency.ts         # Formateo de pesos argentinos
│   │   │   ├── cuit.ts             # Validación de CUIT
│   │   │   ├── dates.ts
│   │   │   └── api-client.ts       # fetch wrapper con auth headers
│   │   │
│   │   └── stores/
│   │       └── authStore.ts        # Zustand store de autenticación
│   │
│   └── routes/
│       ├── index.tsx               # Definición de todas las rutas
│       ├── ProtectedRoute.tsx
│       └── RoleGuard.tsx
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## apps/worker — Backend Cloudflare Worker

```
apps/worker/
│
├── src/
│   ├── index.ts                    # Entry point del Worker (Hono app)
│   │
│   ├── routes/                     # Un archivo por módulo de API
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── inventory.ts
│   │   ├── sales.ts
│   │   ├── invoices.ts
│   │   ├── customers.ts
│   │   ├── cash-register.ts
│   │   ├── suppliers.ts
│   │   ├── purchases.ts
│   │   ├── reports.ts
│   │   └── users.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts                 # Validación JWT
│   │   ├── rbac.ts                 # Role-based access control
│   │   ├── cors.ts
│   │   └── logger.ts
│   │
│   ├── services/                   # Lógica de negocio
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   ├── inventory.service.ts
│   │   ├── sale.service.ts
│   │   ├── invoice.service.ts
│   │   ├── cash-register.service.ts
│   │   └── report.service.ts
│   │
│   ├── workers/                    # Workers especializados
│   │   ├── arca/
│   │   │   ├── index.ts            # Consumer de la Queue de ARCA
│   │   │   ├── wsaa.ts             # Autenticación ARCA (WSAA)
│   │   │   ├── wsfev1.ts           # Facturación ARCA (WSFEv1)
│   │   │   ├── xml-builder.ts      # Construcción de XML ARCA
│   │   │   └── cert-manager.ts     # Gestión de certificados X.509
│   │   │
│   │   ├── pdf-generator/
│   │   │   └── index.ts            # Consumer de la Queue de PDFs
│   │   │
│   │   └── backup/
│   │       └── index.ts            # Cron Trigger backup nocturno
│   │
│   ├── db/                         # Acceso a base de datos
│   │   ├── connection.ts           # Drizzle client factory
│   │   └── queries/                # Queries organizadas por entidad
│   │       ├── products.ts
│   │       ├── sales.ts
│   │       ├── invoices.ts
│   │       └── ...
│   │
│   └── utils/
│       ├── crypto.ts               # Firma JWT, cifrado de certificados
│       ├── pagination.ts
│       └── errors.ts               # Clases de error HTTP
│
├── wrangler.toml
└── tsconfig.json
```

---

## packages/db — Esquema y Migraciones

```
packages/db/
│
├── schema/
│   ├── users.ts                    # Drizzle schema: tabla users
│   ├── products.ts
│   ├── categories.ts
│   ├── inventory.ts
│   ├── sales.ts
│   ├── sale-items.ts
│   ├── invoices.ts
│   ├── customers.ts
│   ├── pets.ts
│   ├── cash-registers.ts
│   ├── cash-movements.ts
│   ├── suppliers.ts
│   ├── purchases.ts
│   ├── purchase-items.ts
│   └── index.ts                    # Re-exports de todos los schemas
│
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_categories.sql
│   ├── 0003_add_invoices.sql
│   └── ...
│
├── seed/
│   ├── categories.ts               # Categorías base (Alimentos, Accesorios, etc.)
│   ├── iva-rates.ts
│   └── default-user.ts             # Usuario admin inicial
│
└── package.json
```

---

## packages/shared — Tipos Compartidos

```
packages/shared/
│
├── types/
│   ├── product.ts
│   ├── sale.ts
│   ├── invoice.ts
│   ├── customer.ts
│   ├── user.ts
│   └── ...
│
└── constants/
    ├── arca.ts                     # Códigos ARCA (tipos comprobante, IVA, etc.)
    ├── fiscal-conditions.ts        # Condiciones frente al IVA
    └── payment-methods.ts
```

---

## Convenciones de Nombrado de Archivos

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componente React | PascalCase | `ProductSearch.tsx` |
| Hook React | camelCase con prefijo `use` | `useCart.ts` |
| Store Zustand | camelCase con sufijo `Store` | `cartStore.ts` |
| Página | PascalCase con sufijo `Page` | `POSPage.tsx` |
| Servicio Worker | camelCase con sufijo `.service.ts` | `sale.service.ts` |
| Route Handler | camelCase plural | `products.ts` |
| Schema Drizzle | camelCase plural | `products.ts` |
| Migración SQL | `{número}_{descripción}.sql` | `0001_initial_schema.sql` |
| Test | mismo nombre + `.test.ts` | `sale.service.test.ts` |
