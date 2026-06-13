# Diseño de Base de Datos de Alto Nivel — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Motor:** SQLite (Cloudflare D1)

---

## 1. Principios de Diseño

- **Normalización razonable.** 3FN como objetivo, desnormalizar solo con justificación de performance.
- **UUIDs como PKs.** `TEXT` con `DEFAULT (lower(hex(randomblob(16))))`. Evita colisiones en imports y facilita merges de datos.
- **Dinero en centavos (INTEGER).** Sin floats para valores monetarios. Ver convenciones de código.
- **Timestamps siempre.** `created_at` y `updated_at` en todas las tablas. `deleted_at` para soft delete cuando aplica.
- **Soft delete selectivo.** Solo donde el historial importa (productos, clientes). Nunca en tablas transaccionales (ventas, movimientos).
- **Sin triggers.** SQLite los soporta pero complican el debug. La lógica de negocio va en el código de aplicación.

---

## 2. Diagrama Entidad-Relación (Alto Nivel)

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│     users       │     │   categories    │     │   iva_rates      │
│─────────────────│     │─────────────────│     │──────────────────│
│ id (PK)         │     │ id (PK)         │     │ id (PK)          │
│ email           │     │ name            │     │ name             │
│ password_hash   │     │ parent_id (FK)  │     │ rate (INTEGER)   │
│ role            │     │ active          │     │ active           │
│ name            │     └────────┬────────┘     └────────┬─────────┘
│ active          │              │                        │
│ created_at      │              │                        │
└────────┬────────┘              │                        │
         │                       ▼                        ▼
         │              ┌─────────────────────────────────────────┐
         │              │              products                    │
         │              │─────────────────────────────────────────│
         │              │ id (PK)                                  │
         │              │ code (UNIQUE) ← código de barras/interno │
         │              │ name                                     │
         │              │ description                              │
         │              │ price_cents (INTEGER)                    │
         │              │ cost_cents (INTEGER)                     │
         │              │ category_id (FK → categories)            │
         │              │ iva_rate_id (FK → iva_rates)             │
         │              │ supplier_id (FK → suppliers, nullable)   │
         │              │ unit (unidad/kg/litro)                   │
         │              │ min_stock (INTEGER)                      │
         │              │ image_r2_key                             │
         │              │ active                                   │
         │              │ created_at / updated_at / deleted_at     │
         │              └──────────────┬──────────────────────────┘
         │                             │
         │              ┌──────────────▼──────────────┐
         │              │         inventory            │
         │              │─────────────────────────────│
         │              │ id (PK)                      │
         │              │ product_id (FK, UNIQUE)      │
         │              │ quantity (INTEGER)            │
         │              │ updated_at                   │
         │              └──────────────┬──────────────┘
         │                             │
         │              ┌──────────────▼──────────────────────────┐
         │              │        inventory_movements               │
         │              │─────────────────────────────────────────│
         │              │ id (PK)                                  │
         │              │ product_id (FK)                          │
         │              │ quantity_change (INTEGER) ← pos/neg      │
         │              │ type (SALE/PURCHASE/ADJUSTMENT/RETURN)   │
         │              │ reference_id ← sale_id o purchase_id     │
         │              │ reference_type (SALE/PURCHASE/MANUAL)    │
         │              │ notes                                    │
         │              │ user_id (FK)                             │
         │              │ created_at                               │
         │              └─────────────────────────────────────────┘
         │
         │   ┌──────────────────┐          ┌──────────────────┐
         │   │    customers     │          │     pets         │
         │   │──────────────────│          │──────────────────│
         │   │ id (PK)          │◄─────────│ customer_id (FK) │
         │   │ name             │    1:N   │ name             │
         │   │ cuit             │          │ species          │
         │   │ fiscal_condition │          │ breed            │
         │   │ email            │          │ birth_date       │
         │   │ phone            │          │ weight_grams     │
         │   │ address          │          │ notes            │
         │   │ active           │          │ active           │
         │   │ created_at/      │          │ created_at       │
         │   │ updated_at/      │          └──────────────────┘
         │   │ deleted_at       │
         │   └────────┬─────────┘
         │            │
         │            ▼
         │   ┌───────────────────────────────────────────────┐
         │   │                   sales                        │
         │   │───────────────────────────────────────────────│
         │   │ id (PK)                                        │
         │   │ customer_id (FK, nullable) ← null=CF           │
         │   │ pet_id (FK, nullable)                          │
         │   │ user_id (FK → users)                           │
         │   │ cash_register_session_id (FK)                  │
         │   │ subtotal_cents (INTEGER)                       │
         │   │ discount_cents (INTEGER)                       │
         │   │ total_iva_cents (INTEGER)                      │
         │   │ total_cents (INTEGER)                          │
         │   │ payment_method                                 │
         │   │ amount_paid_cents (INTEGER)                    │
         │   │ change_cents (INTEGER)                         │
         │   │ status (COMPLETED/CANCELLED/PENDING_INVOICE)   │
         │   │ notes                                          │
         │   │ created_at                                     │
         │   └──────────────┬────────────────────────────────┘
         │                  │
         │   ┌──────────────▼────────────────────────────────┐
         │   │                sale_items                      │
         │   │───────────────────────────────────────────────│
         │   │ id (PK)                                        │
         │   │ sale_id (FK → sales)                           │
         │   │ product_id (FK → products)                     │
         │   │ product_name ← snapshot al momento de la venta │
         │   │ quantity (INTEGER)                             │
         │   │ unit_price_cents (INTEGER) ← snapshot          │
         │   │ discount_cents (INTEGER)                       │
         │   │ iva_rate (INTEGER) ← snapshot                  │
         │   │ iva_amount_cents (INTEGER)                     │
         │   │ subtotal_cents (INTEGER)                       │
         │   └───────────────────────────────────────────────┘
         │
         │   ┌───────────────────────────────────────────────┐
         │   │                  invoices                      │
         │   │───────────────────────────────────────────────│
         │   │ id (PK)                                        │
         │   │ sale_id (FK → sales, UNIQUE)                   │
         │   │ invoice_type (B/C/A)                           │
         │   │ pos_number (INTEGER)                           │
         │   │ invoice_number (INTEGER)                       │
         │   │ customer_cuit ← snapshot                       │
         │   │ customer_name ← snapshot                       │
         │   │ customer_fiscal_condition ← snapshot           │
         │   │ cae                                            │
         │   │ cae_due_date                                   │
         │   │ total_net_cents (INTEGER)                      │
         │   │ total_iva_cents (INTEGER)                      │
         │   │ total_cents (INTEGER)                          │
         │   │ pdf_r2_key                                     │
         │   │ status (PENDING/ISSUED/ERROR)                  │
         │   │ error_message                                  │
         │   │ issued_at                                      │
         │   │ created_at                                     │
         │   └───────────────────────────────────────────────┘
```

---

## 3. Tablas de Caja

```
┌────────────────────────────────────────────────┐
│         cash_register_sessions                  │
│────────────────────────────────────────────────│
│ id (PK)                                         │
│ user_id (FK → users)                            │
│ opening_amount_cents (INTEGER)                  │
│ closing_amount_cents (INTEGER, nullable)         │
│ expected_amount_cents (INTEGER, nullable)        │
│ difference_cents (INTEGER, nullable)             │
│ status (OPEN/CLOSED)                            │
│ opened_at                                       │
│ closed_at                                       │
│ notes                                           │
└────────────────┬───────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────┐
│           cash_movements                        │
│────────────────────────────────────────────────│
│ id (PK)                                         │
│ session_id (FK → cash_register_sessions)        │
│ type (INCOME/EXPENSE)                           │
│ amount_cents (INTEGER)                          │
│ payment_method (CASH/DEBIT/CREDIT/TRANSFER/QR) │
│ description                                     │
│ reference_id ← sale_id o manual                 │
│ reference_type (SALE/MANUAL)                    │
│ user_id (FK)                                    │
│ created_at                                      │
└─────────────────────────────────────────────────┘
```

---

## 4. Tablas de Compras y Proveedores

```
┌───────────────────────────────┐
│          suppliers            │
│───────────────────────────────│
│ id (PK)                       │
│ name                          │
│ cuit                          │
│ fiscal_condition              │
│ contact_name                  │
│ phone                         │
│ email                         │
│ address                       │
│ payment_terms                 │
│ active                        │
│ created_at / updated_at       │
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────────────────────┐
│               purchases                        │
│───────────────────────────────────────────────│
│ id (PK)                                        │
│ supplier_id (FK)                               │
│ user_id (FK)                                   │
│ status (DRAFT/ORDERED/RECEIVED/CANCELLED)      │
│ supplier_invoice_number                        │
│ supplier_invoice_date                          │
│ total_cents (INTEGER)                          │
│ notes                                          │
│ ordered_at                                     │
│ received_at                                    │
│ created_at / updated_at                        │
└───────────────┬───────────────────────────────┘
                │
┌───────────────▼───────────────────────────────┐
│             purchase_items                     │
│───────────────────────────────────────────────│
│ id (PK)                                        │
│ purchase_id (FK)                               │
│ product_id (FK)                                │
│ quantity_ordered (INTEGER)                     │
│ quantity_received (INTEGER)                    │
│ unit_cost_cents (INTEGER)                      │
│ total_cost_cents (INTEGER)                     │
└───────────────────────────────────────────────┘
```

---

## 5. Consideraciones Especiales de Diseño

### Snapshots en sale_items e invoices

Los ítems de venta y las facturas guardan **snapshots** de los datos al momento de la operación:

```sql
-- sale_items guarda el nombre y precio al momento de la venta
product_name TEXT NOT NULL,    -- aunque el producto cambie de nombre después
unit_price_cents INTEGER NOT NULL,  -- aunque el precio cambie
iva_rate INTEGER NOT NULL      -- aunque la alícuota cambie
```

**Por qué:** Una factura emitida es un documento legal. El sistema no puede alterar los montos ni descripciones de una venta pasada aunque se actualice el catálogo.

### Índices Recomendados

```sql
-- Búsqueda de productos en POS (crítica para performance)
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_active ON products(active);

-- Consultas de ventas por fecha (reportes)
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_customer ON sales(customer_id);

-- Facturas por número (consulta frecuente)
CREATE UNIQUE INDEX idx_invoices_number ON invoices(pos_number, invoice_number, invoice_type);

-- Movimientos de inventario por producto
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id, created_at);

-- Búsqueda de clientes
CREATE INDEX idx_customers_cuit ON customers(cuit);
CREATE INDEX idx_customers_name ON customers(name);
```

### Soft Delete

Solo en tablas donde el historial importa y donde el registro tiene FK en otras tablas:

- `products.deleted_at` — un producto borrado puede seguir apareciendo en ventas históricas.
- `customers.deleted_at` — un cliente "borrado" puede tener facturas emitidas.
- `suppliers.deleted_at` — puede tener compras históricas.

Las tablas transaccionales (sales, invoices, cash_movements) **no tienen soft delete**. Se cancelan, no se borran.

---

## 6. Datos de Configuración

```
┌────────────────────────────────────┐
│         store_settings             │
│────────────────────────────────────│
│ key (PK, TEXT)                     │
│ value (TEXT)                       │
│ updated_at                         │
└────────────────────────────────────┘
```

Valores almacenados:
- `store_name`: "Dorothea Pet Shop"
- `store_cuit`: "30-XXXXXXXX-X"
- `store_fiscal_condition`: "RI"
- `store_address`: "..."
- `arca_pos_number`: "1"
- `store_iva_condition`: "Responsable Inscripto"

Estos valores se cachean en KV al inicio de la aplicación.

---

## 7. Estimación de Volumen de Datos

Para una tienda de mascotas PyME con ~5 años de operación:

| Tabla | Filas estimadas | Tamaño estimado |
|---|---|---|
| products | 500-2000 | < 1 MB |
| sales | 50,000-200,000 | < 50 MB |
| sale_items | 150,000-600,000 | < 150 MB |
| invoices | 50,000-200,000 | < 50 MB |
| customers | 500-5,000 | < 1 MB |
| inventory_movements | 100,000-500,000 | < 100 MB |
| **Total estimado** | | **< 400 MB** |

D1 tiene límite de 10 GB por base de datos. Hay margen de sobra para años de operación.

---

## 8. Estrategia de Migración desde Pascal

### Tablas a migrar del sistema viejo

1. **Productos** → `products` + `inventory` (stock inicial).
2. **Clientes** → `customers`.
3. **Categorías** → `categories`.
4. **Proveedores** (si existen) → `suppliers`.

### Tablas que NO se migran

- Historial de ventas del sistema viejo (es datos de otro sistema, potencialmente inconsistentes).
- Facturas antiguas (no tienen formato compatible con CAE moderno).
- Configuraciones del sistema Pascal (se configuran desde cero).

### Proceso de migración

```
Sistema Pascal
      │
      │ Export manual a CSV
      ▼
CSV de productos (código, nombre, precio, categoría, stock)
      │
      │ Script de validación:
      │   - detecta duplicados
      │   - valida CUITs
      │   - normaliza encoding (ISO-8859-1 → UTF-8)
      │   - reporta filas con datos faltantes
      ▼
CSV limpio y validado
      │
      │ Script de importación:
      │   - inserta en products
      │   - crea registro en inventory con stock inicial
      │   - asigna categorías
      ▼
D1 staging
      │
      │ Validación manual con dueño del negocio
      ▼
D1 producción (solo después de aprobación)
```
