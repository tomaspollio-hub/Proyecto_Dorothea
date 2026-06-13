# Diagrama de Dependencias entre Módulos — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## 1. Mapa de Dependencias Completo

Las flechas indican "depende de" / "consume datos de".

```
                          ┌────────────────┐
                          │   PROVEEDORES  │
                          └───────┬────────┘
                                  │ proveedor_id
                                  ▼
┌──────────────┐          ┌───────────────┐          ┌──────────────┐
│   USUARIOS   │          │   PRODUCTOS   │          │   MASCOTAS   │
│  Y PERMISOS  │          │               │          │              │
└──────┬───────┘          └───┬───────────┘          └──────┬───────┘
       │ auth/roles           │ product_id                  │ pet_id
       │ (todos los módulos)  │                             │
       │          ┌───────────▼──────────────────┐         │
       │          │          STOCK               │         │
       │          │  (product_id → quantity)     │         │
       │          └───────────┬──────────────────┘         │
       │                      │ stock_on_hand               │
       │                      ▼                             │
       │          ┌───────────────────────┐                 │
       │          │       VENTAS          │◄────────────────┘
       │          │        (POS)          │ customer_id + pet_id
       │          │                       │
       │          └──┬────────────────┬───┘
       │             │                │
       │    sale_id  │                │ sale_id
       │             ▼                ▼
       │    ┌────────────────┐   ┌──────────┐
       │    │  FACTURACIÓN   │   │   CAJA   │
       │    │     ARCA       │   │          │
       │    └────────┬───────┘   └──────────┘
       │             │                         ┌────────────────────┐
       │    invoice  │ data                    │     COMPRAS        │
       │    data     ▼                         │                    │
       │    ┌────────────────┐                 └────┬───────────────┘
       │    │    CLIENTES    │◄────────────────────┤ proveedor_id
       │    └────────────────┘                      │ product_id
       │                                            │ stock += receipt
       ▼                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         REPORTES                                │
│  (lee de: Ventas, Stock, Caja, Facturas, Compras, Productos)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              CONTABILIDAD / EXPORTACIONES                        │
│   (lee de: Facturas ARCA, Compras, Caja, Reportes)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Tabla de Dependencias Directas

| Módulo | Depende de | Relación |
|---|---|---|
| Ventas | Productos | Consulta catálogo y precios |
| Ventas | Stock | Verifica disponibilidad y descuenta |
| Ventas | Clientes | Recupera datos fiscales del comprador |
| Ventas | Mascotas | Asocia compra a mascota (opcional) |
| Facturación ARCA | Ventas | Recibe datos del comprobante a emitir |
| Facturación ARCA | Clientes | CUIT/condición IVA para tipo de comprobante |
| Facturación ARCA | Productos | Alícuota IVA por ítem |
| Caja | Ventas | Registra cada venta como ingreso |
| Stock | Ventas | Recibe señal de descuento post-venta |
| Stock | Compras | Recibe señal de incremento post-recepción |
| Compras | Proveedores | Asocia orden de compra a proveedor |
| Compras | Productos | Selección de ítems a comprar |
| Productos | Proveedores | Proveedor habitual por producto |
| Mascotas | Clientes | Toda mascota pertenece a un cliente |
| Reportes | Ventas, Stock, Caja, Facturas, Compras | Solo lectura |
| Contabilidad | Facturas ARCA, Compras, Caja | Solo lectura, exportación |
| Todos | Usuarios/Permisos | Validación de acceso en cada operación |

---

## 3. Módulos sin Dependencias Externas (fuentes primarias)

Estos módulos son "hojas" del árbol de dependencias — no dependen de otros módulos, solo son consumidos:

- **Proveedores:** no depende de ningún otro módulo.
- **Clientes:** no depende de ningún otro módulo.
- **Productos:** depende solo de Proveedores (referencia opcional).
- **Usuarios y Permisos:** no depende de ningún módulo de negocio.

Estos deben desarrollarse primero.

---

## 4. Orden de Desarrollo Forzado por Dependencias

El orden no es una elección de conveniencia, es un requisito de dependencia:

```
NIVEL 0 (sin dependencias):
  → Usuarios y Permisos
  → Clientes
  → Proveedores

NIVEL 1 (depende de Nivel 0):
  → Productos (depende de Proveedores)
  → Mascotas (depende de Clientes)

NIVEL 2 (depende de Nivel 1):
  → Stock (depende de Productos)
  → Compras (depende de Proveedores + Productos)

NIVEL 3 (depende de Nivel 0 + 1 + 2):
  → Ventas / POS (depende de Productos + Stock + Clientes)
  → Caja (depende de Ventas)

NIVEL 4 (depende de Nivel 3):
  → Facturación ARCA (depende de Ventas + Clientes + Productos)

NIVEL 5 (depende de todo):
  → Reportes
  → Contabilidad / Exportaciones
```

---

## 5. Contratos de Interfaz entre Módulos Críticos

### Contrato: Ventas → Stock

Al confirmar una venta, Ventas envía a Stock:
```
{
  sale_id: string,
  items: [
    { product_id: string, quantity: number }
  ],
  operation: "DECREMENT"
}
```
Stock valida que haya suficiente stock antes de confirmar. Si falla, la venta no se confirma.

### Contrato: Ventas → Facturación ARCA

Al confirmar una venta, se encola el siguiente payload para ARCA:
```
{
  sale_id: string,
  invoice_type: "B" | "C",
  customer: {
    cuit: string | null,
    name: string,
    fiscal_condition: "CF" | "RI" | "MONO" | "EXENTO"
  },
  items: [
    {
      description: string,
      quantity: number,
      unit_price: number,  // sin IVA
      iva_rate: 0 | 10.5 | 21,
      iva_amount: number
    }
  ],
  total_net: number,
  total_iva: number,
  total: number,
  payment_method: string,
  pos_number: number,
  date: string  // ISO 8601
}
```

### Contrato: Ventas → Caja

Al confirmar una venta:
```
{
  sale_id: string,
  amount: number,
  payment_method: "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "QR",
  movement_type: "INCOME",
  timestamp: string
}
```

---

## 6. Dependencias Circulares — Análisis

No existen dependencias circulares en el diseño actual. Ventas es el nodo central que consume datos de los módulos base (Productos, Clientes, Stock) y produce datos para los módulos de registro (Caja, Facturación).

La única precaución necesaria:

- **Stock ↔ Ventas:** Stock descuenta por señal de Ventas, pero Ventas consulta Stock antes de vender. Esto no es circular: la consulta (lectura) y el descuento (escritura) son operaciones secuenciales en la misma transacción.
