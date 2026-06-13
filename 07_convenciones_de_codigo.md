# Convenciones de Código — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## 1. Principios Generales

Antes de las reglas específicas, tres principios que guían todas las decisiones:

1. **Código que se lee se mantiene.** La legibilidad siempre gana sobre la brevedad.
2. **Un lugar para cada cosa.** Si no sabés dónde va algo, el diseño está incompleto.
3. **Falla ruidosamente.** Los errores deben ser obvios, no silenciosos.

---

## 2. Lenguaje y Tipado

### TypeScript Estricto

Todo el proyecto usa TypeScript con configuración estricta:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Reglas:**

- `any` está prohibido. Si TypeScript no puede inferir, se define el tipo explícito.
- Preferir `type` sobre `interface` para tipos de datos. `interface` solo para contratos de objetos que se extienden.
- Los tipos compartidos entre frontend y backend van en `packages/shared`.
- No usar `as Type` a menos que haya validación de runtime inmediatamente antes (Zod).
- Nunca `!` (non-null assertion) sin comentario que justifique por qué es imposible que sea null.

### Zod para Datos Externos

Todo dato que entra al sistema desde fuera (request body, parámetros de URL, datos de ARCA, imports de CSV) se valida con Zod antes de usarse:

```typescript
// Correcto
const body = CreateProductSchema.parse(await c.req.json())

// Incorrecto
const body = await c.req.json() as CreateProductInput
```

---

## 3. Nomenclatura

### Variables y Funciones

| Tipo | Convención | Ejemplo |
|---|---|---|
| Variable local | camelCase | `totalAmount` |
| Función | camelCase, verbo descriptivo | `calculateTotalWithIva()` |
| Constante de módulo | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Tipo TypeScript | PascalCase | `SaleItem` |
| Enum TypeScript | PascalCase | `PaymentMethod` |
| Componente React | PascalCase | `ProductCard` |
| Hook React | camelCase con `use` | `useProductSearch` |

### Nomenclatura de Dominio

Usar consistentemente los términos del dominio. Si se llama "venta" en el negocio, el código dice `sale`, no `order`, `transaction`, ni `purchase` (que en este sistema es "compra a proveedor").

Glosario técnico obligatorio:

| Negocio | Código | Nunca usar |
|---|---|---|
| Venta | `sale` | `order`, `transaction` |
| Compra (a proveedor) | `purchase` | `buy`, `order` |
| Factura | `invoice` | `receipt`, `bill` |
| Ticket de venta | `receipt` | `ticket` |
| Producto | `product` | `item`, `article` |
| Ítem de venta | `sale_item` | `line_item`, `cart_item` |
| Caja | `cash_register` | `till`, `drawer` |
| Movimiento de caja | `cash_movement` | `cash_flow`, `entry` |
| Stock / Inventario | `inventory` | `stock` (en código) |
| Proveedor | `supplier` | `vendor`, `provider` |
| Comprobante ARCA | `invoice` | `fiscal_document`, `afip_doc` |

---

## 4. Estructura de un Endpoint (Worker)

Todo endpoint sigue este patrón sin excepción:

```typescript
// routes/products.ts
app.post('/products', requireRole('admin'), async (c) => {
  // 1. Validar input
  const body = CreateProductSchema.parse(await c.req.json())

  // 2. Llamar al service (lógica de negocio)
  const product = await productService.create(c.env.DB, body)

  // 3. Retornar respuesta tipada
  return c.json({ data: product }, 201)
})
```

**Reglas:**
- La validación es siempre el primer paso. Si falla, Zod lanza excepción, el middleware de errores devuelve 422.
- La lógica de negocio va en el `service`, nunca en el route handler.
- Los route handlers no acceden directamente a la base de datos.
- Los responses siguen siempre el formato `{ data: T }` para éxito o `{ error: string, details?: unknown }` para error.

---

## 5. Estructura de un Service

```typescript
// services/product.service.ts
export const productService = {
  async create(db: D1Database, input: CreateProductInput): Promise<Product> {
    // Validaciones de negocio (no de formato, eso ya lo hace Zod)
    const existing = await db.prepare(
      'SELECT id FROM products WHERE code = ?'
    ).bind(input.code).first()

    if (existing) {
      throw new ConflictError(`Producto con código ${input.code} ya existe`)
    }

    // Operación principal
    const result = await db.prepare(`
      INSERT INTO products (id, code, name, price, iva_rate_id, category_id, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).bind(
      crypto.randomUUID(),
      input.code,
      input.name,
      input.price,
      input.ivaRateId,
      input.categoryId
    ).run()

    return { id: result.meta.last_row_id, ...input }
  }
}
```

**Reglas:**
- Los services son objetos con métodos, no clases.
- No tienen estado. Son funciones puras con efectos de lado explícitos.
- Lanzan excepciones de dominio (no `new Error()` genérico). Ver sección de errores.
- Reciben `db` como primer parámetro (dependency injection explícita, fácil de testear).

---

## 6. Manejo de Errores

### Jerarquía de errores

```typescript
// utils/errors.ts
class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message)
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 404)
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422)
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super('No autorizado', 401)
  }
}
```

### Middleware de errores global (Hono)

```typescript
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode)
  }
  if (err instanceof ZodError) {
    return c.json({ error: 'Datos inválidos', details: err.errors }, 422)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: 'Error interno del servidor' }, 500)
})
```

**Reglas:**
- Nunca `console.error` en los services. Solo en el handler global.
- Nunca swallow exceptions (capturar y no hacer nada).
- Nunca retornar `{ success: false }` sin un código HTTP apropiado.

---

## 7. Componentes React

### Estructura de un componente

```typescript
// components/ProductCard.tsx

// 1. Imports externos
import { useState } from 'react'

// 2. Imports internos (tipos, hooks, utils)
import type { Product } from '@dorothea/shared'
import { formatCurrency } from '@/shared/utils/currency'

// 3. Tipos del componente
type ProductCardProps = {
  product: Product
  onAddToCart: (product: Product) => void
}

// 4. El componente (sin export default, usar named export)
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // hooks primero
  const [isLoading, setIsLoading] = useState(false)

  // handlers
  function handleClick() {
    onAddToCart(product)
  }

  // render
  return (
    <div>
      <span>{product.name}</span>
      <span>{formatCurrency(product.price)}</span>
      <button onClick={handleClick}>Agregar</button>
    </div>
  )
}
```

**Reglas:**
- Named exports siempre. No `export default`.
- Props como `type`, no `interface`.
- No usar `React.FC`. Tipado directo con destructuring.
- Handlers con prefijo `handle`. Callbacks recibidos como props con prefijo `on`.
- Componentes puros cuando sea posible (sin side effects en el render).
- Si un componente supera 150 líneas, probablemente puede dividirse.

---

## 8. Estado Global (Zustand)

```typescript
// stores/cartStore.ts
type CartState = {
  items: CartItem[]
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product, quantity) => set((state) => ({
    items: [...state.items, { product, quantity }]
  })),

  removeItem: (productId) => set((state) => ({
    items: state.items.filter(item => item.product.id !== productId)
  })),

  clear: () => set({ items: [] }),

  total: () => get().items.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  )
}))
```

**Reglas:**
- Un store por dominio (cartStore, authStore).
- Los stores no hacen fetch. Los hooks de TanStack Query hacen fetch; los stores guardan estado de UI.
- Los stores del POS (carrito) se resetean al confirmar una venta.

---

## 9. Queries de Base de Datos (D1 con Drizzle)

```typescript
// db/queries/products.ts

// Preferir Drizzle query builder sobre SQL raw
export async function getProductByCode(db: DrizzleD1, code: string) {
  return db.select()
    .from(products)
    .where(eq(products.code, code))
    .limit(1)
    .then(rows => rows[0] ?? null)
}

// SQL raw solo cuando Drizzle no alcanza (ej: queries complejas de reportes)
export async function getTopSellingProducts(db: D1Database, limit: number) {
  return db.prepare(`
    SELECT p.id, p.name, SUM(si.quantity) as total_sold
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.created_at >= date('now', '-30 days')
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT ?
  `).bind(limit).all()
}
```

**Reglas:**
- Nunca concatenar strings para construir SQL. Siempre parámetros bind o query builder.
- Todas las escrituras críticas (venta + stock + caja) en una sola transacción D1.
- Los queries de reportes van en `db/queries/reports.ts`, separados de los queries operativos.

---

## 10. Dinero y Aritmética Financiera

**Regla crítica: nunca usar `float` para dinero.**

Almacenar todos los montos en la base de datos como **enteros en centavos**.

```typescript
// Correcto: precio almacenado en centavos
const price = 1250 // $12.50

// Incorrecto
const price = 12.50 // float, riesgo de error de redondeo

// Formateo para mostrar
const formatted = formatCurrency(price) // "$12,50"

// utils/currency.ts
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(cents / 100)
}

export function toCents(pesos: number): number {
  return Math.round(pesos * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}
```

Esto aplica a: precios, totales, IVA, movimientos de caja, todo.

---

## 11. Git y Control de Versiones

### Commits

Seguir Conventional Commits:

```
feat(pos): agregar búsqueda por código de barras
fix(arca): corregir manejo de timeout en WSAA
refactor(inventory): simplificar cálculo de stock disponible
test(sales): agregar test de venta con descuento
docs(api): documentar endpoint de cierre de caja
```

**Tipos permitidos:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`

### Ramas

```
main           → producción, protegida
dev            → integración, se hace deploy a staging
feature/XXX    → desarrollo de features
fix/XXX        → corrección de bugs
```

### Pull Requests

- Toda feature pasa por PR a `dev`.
- PR requiere que los tests de CI pasen.
- Descripción del PR incluye: qué cambia, cómo testearlo manualmente, capturas si hay cambios de UI.
