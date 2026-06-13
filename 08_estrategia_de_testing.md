# Estrategia de Testing — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## 1. Filosofía de Testing

**No se testa todo. Se testa lo que importa.**

En un proyecto de este tamaño con recursos limitados, hay que ser selectivo. El principio guía es:

> Testear en proporción al costo del fallo.

Un error en el cálculo de IVA que afecta la facturación tiene un costo altísimo (legal, fiscal, reputacional). Un texto mal alineado tiene costo bajo. El testing se invierte en consecuencia.

**Pirámide de testing aplicada a este proyecto:**

```
           /▲\
          / E2E\           → Pocos, solo los flujos críticos
         /-------\
        /  Integr. \       → Moderados, flujos de API end-to-end
       /-------------\
      /  Unit Tests   \    → Muchos, lógica de negocio pura
     /─────────────────\
    / Manual / Exploratory\  → UAT con el dueño del negocio
```

---

## 2. Stack de Testing

| Herramienta | Propósito |
|---|---|
| **Vitest** | Tests unitarios e integración (frontend y backend) |
| **Cloudflare Miniflare** | Entorno local de Workers para tests de integración |
| **Playwright** | Tests E2E del flujo completo en navegador |
| **Testing Library** | Tests de componentes React |
| **Zod** | Validación (ya en el código de producción, no solo en tests) |

---

## 3. Tests Unitarios

### Qué testear con tests unitarios

**Alta prioridad (obligatorio):**

- Cálculos financieros: IVA, totales, descuentos, cambio.
- Lógica de ARCA: construcción del XML, parsing de respuestas.
- Validación de CUIT (algoritmo de dígito verificador).
- Lógica de descuentos y promociones.
- Conversión de montos (centavos ↔ pesos).
- Determinación del tipo de comprobante según condición fiscal del cliente.

**Media prioridad:**

- Parseo de respuestas de ARCA (XML → objeto TypeScript).
- Cálculo de diferencia en cierre de caja.
- Lógica de stock bajo mínimo.
- Validación de formularios con Zod.

**No es necesario testear unitariamente:**

- Route handlers de Hono (esos van en integración).
- Componentes React de presentación pura (botones, labels).
- Queries de base de datos (esos van en integración con Miniflare).

### Ejemplo de test unitario prioritario

```typescript
// sale.service.test.ts

describe('calculateSaleTotal', () => {
  it('calcula IVA 21% correctamente', () => {
    const items = [{ price: 10000, quantity: 1, ivaRate: 21 }] // $100.00
    const result = calculateSaleTotal(items)
    expect(result.totalNet).toBe(8264)   // $82.64 sin IVA
    expect(result.totalIva).toBe(1736)   // $17.36 IVA
    expect(result.total).toBe(10000)     // $100.00
  })

  it('aplica descuento antes de calcular IVA', () => {
    const items = [{ price: 10000, quantity: 1, ivaRate: 21 }]
    const result = calculateSaleTotal(items, { discountPercent: 10 })
    expect(result.total).toBe(9000)      // $90.00
  })

  it('maneja múltiples alícuotas de IVA', () => {
    const items = [
      { price: 10000, quantity: 1, ivaRate: 21 },  // alimento seco
      { price: 5000, quantity: 2, ivaRate: 10.5 }  // alimento para humanos (ejemplo)
    ]
    const result = calculateSaleTotal(items)
    expect(result.total).toBe(20000)
  })
})
```

```typescript
// cuit.test.ts

describe('validateCuit', () => {
  it('valida CUIT correcto', () => {
    expect(validateCuit('20-12345678-3')).toBe(true)
  })

  it('rechaza CUIT con dígito verificador incorrecto', () => {
    expect(validateCuit('20-12345678-9')).toBe(false)
  })

  it('acepta CUIT sin guiones', () => {
    expect(validateCuit('20123456783')).toBe(true)
  })
})
```

---

## 4. Tests de Integración

### Qué testear con Miniflare

Los tests de integración verifican que los endpoints de la API funcionan de punta a punta, incluyendo la base de datos (D1 local via Miniflare).

**Flujos a testear obligatoriamente:**

1. **Flujo de login:** POST /auth/login → recibe JWT → GET /products (autenticado) → funciona.
2. **Flujo de creación de producto:** POST /products → producto en DB → GET /products/:id → datos correctos.
3. **Flujo de venta:** POST /sales → stock decrementado → movimiento de caja registrado → factura encolada.
4. **Flujo de apertura/cierre de caja:** POST /cash-register/open → registra ventas → POST /cash-register/close → cuadre correcto.
5. **RBAC:** cajero no puede acceder a endpoints de admin. Retorna 403.

```typescript
// sales.integration.test.ts

describe('POST /api/v1/sales', () => {
  beforeEach(async () => {
    await seedDatabase()  // datos de prueba: 1 producto, stock=10
  })

  it('crea una venta y descuenta el stock', async () => {
    const response = await app.request('/api/v1/sales', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testToken}` },
      body: JSON.stringify({
        customerId: null,
        items: [{ productId: 'prod-1', quantity: 2 }],
        paymentMethod: 'CASH',
        amountPaid: 20000
      })
    })

    expect(response.status).toBe(201)

    const stockRecord = await db.prepare(
      'SELECT quantity FROM inventory WHERE product_id = ?'
    ).bind('prod-1').first()

    expect(stockRecord?.quantity).toBe(8)  // 10 - 2
  })

  it('rechaza venta si no hay stock suficiente', async () => {
    const response = await app.request('/api/v1/sales', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testToken}` },
      body: JSON.stringify({
        items: [{ productId: 'prod-1', quantity: 999 }],
        // ...
      })
    })

    expect(response.status).toBe(409)
  })
})
```

---

## 5. Tests E2E (Playwright)

Los E2E son costosos en tiempo y mantenimiento. Solo cubrir los "happy paths" críticos del negocio:

**Suite de E2E mínima (obligatoria):**

1. **Login y acceso al POS.**
2. **Venta simple:** buscar producto → agregar → confirmar → ver ticket.
3. **Venta con factura:** seleccionar cliente con CUIT → confirmar → esperar CAE → ver factura.
4. **Cierre de caja:** abrir caja → hacer 1 venta → cerrar caja → verificar cuadre.

**Configuración de E2E:**

- Corren contra el ambiente de `staging` (no producción, no local).
- Se ejecutan en CI solo cuando se hace push a `dev` o `main`.
- Usan una base de datos de staging limpia que se resetea antes de cada suite.
- No mockean ARCA — usan el ambiente de homologación de ARCA.

```typescript
// tests/e2e/pos-sale.spec.ts

test('cajero puede completar una venta simple', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'cajero@dorothea.com')
  await page.fill('[name=password]', 'test-password')
  await page.click('[type=submit]')

  await expect(page).toHaveURL('/pos')

  // Buscar producto por código
  await page.fill('[data-testid=product-search]', '7790001234567')
  await page.click('[data-testid=product-result-0]')

  // Verificar que está en el carrito
  await expect(page.locator('[data-testid=cart-item-0]')).toBeVisible()

  // Confirmar venta
  await page.click('[data-testid=confirm-sale-btn]')
  await page.click('[data-testid=payment-cash]')
  await page.fill('[data-testid=amount-paid]', '1000')
  await page.click('[data-testid=finalize-sale-btn]')

  // Verificar ticket
  await expect(page.locator('[data-testid=receipt]')).toBeVisible()
})
```

---

## 6. Testing Manual / UAT

Parte del proceso, no un extra. Antes de cada release:

### Checklist de UAT (User Acceptance Testing)

A ejecutar por el dueño del negocio o el cajero real:

**Operaciones de venta:**
- [ ] Buscar producto por código de barras.
- [ ] Buscar producto por nombre.
- [ ] Agregar múltiples productos al carrito.
- [ ] Modificar cantidad de un ítem.
- [ ] Eliminar ítem del carrito.
- [ ] Aplicar descuento por ítem.
- [ ] Aplicar descuento total.
- [ ] Seleccionar cliente registrado.
- [ ] Vender a consumidor final.
- [ ] Pagar en efectivo con vuelto.
- [ ] Pagar con tarjeta.
- [ ] Confirmar venta y ver ticket.

**Facturación:**
- [ ] Factura B a consumidor final.
- [ ] Factura C desde monotributista.
- [ ] Verificar que el PDF tiene CAE y QR correcto.
- [ ] Verificar que el comprobante se puede imprimir.

**Caja:**
- [ ] Abrir caja con monto inicial.
- [ ] Registrar un egreso manual.
- [ ] Cerrar caja y verificar que el cuadre es correcto.

---

## 7. Testing de ARCA (específico)

ARCA requiere una estrategia de testing particular:

### Ambiente de Homologación

ARCA provee un ambiente de testing ("homologación") separado del productivo. Todo el desarrollo y QA de facturación se hace en homologación:

- URL: `https://wsaahomo.afip.gov.ar/ws/services/LoginCms`
- Certificados de homologación (distintos a los de producción).
- Los CAE de homologación no son válidos fiscalmente.

### Tests de ARCA en CI

Los tests que llaman a ARCA real son lentos e inestables (ARCA puede estar caído). Se usan de dos maneras:

1. **En desarrollo:** Contra homologación, tests marcados como `@slow` o `@external`, excluidos por defecto del CI rápido.
2. **Pre-release:** Suite completa de ARCA contra homologación, ejecutada manualmente antes de cada deploy a producción.

### Casos de prueba ARCA obligatorios

- [ ] Obtención de Token de Autorización (TA) desde WSAA.
- [ ] Renovación de TA vencido.
- [ ] Emisión de Factura B a consumidor final (sin CUIT).
- [ ] Emisión de Factura C.
- [ ] Manejo de error: CUIT inválido del emisor.
- [ ] Manejo de error: comprobante con número duplicado.
- [ ] Manejo de timeout: ARCA tarda más de 10 segundos.

---

## 8. Cobertura de Tests

**Metas de cobertura (no al 100%):**

| Tipo de código | Meta de cobertura |
|---|---|
| Lógica financiera (IVA, totales, descuentos) | 100% |
| Lógica ARCA (construcción XML, parsing) | 100% |
| Servicios de negocio críticos (sale, invoice) | 80%+ |
| Route handlers | 70%+ (via integración) |
| Componentes React de UI | 40%+ (solo lógica, no presentación) |
| Utilidades (currency, cuit, dates) | 100% |

La cobertura se mide con Vitest y se reporta en CI. No bloquea el merge, pero se monitorea para detectar degradación.

---

## 9. Datos de Prueba

### Estrategia

- Los tests unitarios generan sus propios datos mínimos (no seed).
- Los tests de integración usan un `beforeEach` que ejecuta el seed de test.
- Los E2E usan un ambiente de staging con datos fijos conocidos.

### Nunca usar datos de producción en tests

Los datos de producción (CUITs reales, nombres de clientes, historial de ventas) no se copian a ambientes de testing. Se generan datos ficticios.

```typescript
// test/factories/product.factory.ts
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    code: '7790001000000',
    name: 'Producto de Prueba',
    price: 10000,  // $100.00 en centavos
    ivaRate: 21,
    categoryId: 'cat-alimentos',
    active: true,
    ...overrides
  }
}
```
