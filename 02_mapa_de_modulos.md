# Mapa de Módulos — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## Visión General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DOROTHEA ERP                                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    NÚCLEO OPERATIVO (Fase 1)                    │   │
│  │                                                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │          │  │          │  │          │  │              │   │   │
│  │  │ VENTAS   │  │PRODUCTOS │  │  STOCK   │  │   CLIENTES   │   │   │
│  │  │  (POS)   │  │          │  │          │  │              │   │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │   │
│  │       │              │              │               │            │   │
│  │       └──────────────┴──────────────┴───────────────┘           │   │
│  │                              │                                   │   │
│  │               ┌──────────────▼──────────────┐                   │   │
│  │               │        FACTURACIÓN           │                   │   │
│  │               │           ARCA               │                   │   │
│  │               └──────────────┬──────────────┘                   │   │
│  │                              │                                   │   │
│  │               ┌──────────────▼──────────────┐                   │   │
│  │               │            CAJA              │                   │   │
│  │               └─────────────────────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  MÓDULOS DE GESTIÓN (Fase 2)                    │   │
│  │                                                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │ COMPRAS  │  │PROVEEDOR.│  │ MASCOTAS │  │  USUARIOS /  │   │   │
│  │  │          │  │          │  │          │  │  PERMISOS    │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  MÓDULOS ANALÍTICOS (Fase 3)                    │   │
│  │                                                                  │   │
│  │          ┌──────────────────┐    ┌───────────────────────┐      │   │
│  │          │    REPORTES      │    │   CONTABILIDAD /      │      │   │
│  │          │                  │    │   EXPORTACIONES       │      │   │
│  │          └──────────────────┘    └───────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Descripción Detallada de Cada Módulo

---

### M01 — VENTAS (POS)

**Propósito:** Interfaz de punto de venta para el mostrador. Es el módulo más usado del sistema, debe ser el más rápido y robusto.

**Responsabilidades:**
- Búsqueda y selección de productos (por código de barras, nombre, categoría).
- Armado de carrito de compra.
- Aplicación de descuentos (por ítem o por total).
- Selección de cliente (o Consumidor Final).
- Selección de medio de pago (efectivo, tarjeta débito, tarjeta crédito, transferencia, QR).
- Procesamiento y confirmación de venta.
- Impresión / envío de ticket y factura.
- Consulta de ventas del día.
- Devoluciones parciales y totales (v2).

**Actores:** Cajero, Supervisor.

**Interfaces hacia otros módulos:**
- → Stock: descuenta unidades al confirmar venta.
- → Caja: registra movimiento de ingreso.
- → Facturación ARCA: solicita emisión de comprobante fiscal.
- → Clientes: recupera datos fiscales del cliente.
- → Productos: consulta precios y disponibilidad.

**Notas de UX críticas:**
- La búsqueda de producto debe responder en menos de 300ms.
- Flujo completo de venta con teclado (sin mouse) para cajeros experimentados.
- Vista optimizada para pantallas de 1280px (mostrador típico).

---

### M02 — FACTURACIÓN ARCA

**Propósito:** Integración con el sistema de facturación electrónica de ARCA (ex-AFIP) para la emisión de comprobantes fiscales válidos.

**Responsabilidades:**
- Gestión de certificados digitales X.509 (alta, renovación).
- Autenticación con WSAA (Web Service de Autenticación y Autorización).
- Emisión de comprobantes tipo B y C (Fase 1). Tipo A (Fase 2).
- Obtención y almacenamiento de CAE.
- Generación de PDF del comprobante con código de barras/QR.
- Consulta de comprobantes emitidos.
- Manejo de contingencias (ARCA offline).
- Numeración automática por punto de venta.

**Actores:** Sistema (automático), Admin (configuración).

**Tipos de comprobantes:**
| Código | Descripción | Uso |
|---|---|---|
| 06 | Factura B | RI → Consumidor Final |
| 11 | Factura C | Monotributista → cualquiera |
| 08 | Nota de Crédito B | Devolución |
| 13 | Nota de Crédito C | Devolución |

**Interfaces hacia otros módulos:**
- ← Ventas: recibe datos de la venta para construir el comprobante.
- ← Clientes: recupera CUIT/CUIL y condición fiscal.
- → Reportes: provee datos de IVA para libro fiscal.

---

### M03 — PRODUCTOS

**Propósito:** Gestión del catálogo de productos de la tienda.

**Responsabilidades:**
- Alta, baja y modificación de productos.
- Gestión de categorías y subcategorías (ej: Alimentos > Perro > Cachorro).
- Precios de venta (con y sin IVA).
- Precios de costo (para margen).
- Código de barras (EAN-13, EAN-8, código interno).
- Imágenes de productos (almacenadas en R2).
- Unidades de medida (unidad, kg, litro).
- Estado activo/inactivo.
- Proveedor habitual asociado.
- Alícuota de IVA por producto (21%, 10.5%, 0%).
- Stock mínimo (para alertas).

**Actores:** Admin, Supervisor.

**Interfaces hacia otros módulos:**
- → Ventas: provee catálogo para búsqueda en POS.
- → Stock: cada producto tiene un registro de stock asociado.
- → Compras: asociación con proveedor habitual.
- → Facturación: provee alícuota IVA para cálculo.

---

### M04 — STOCK

**Propósito:** Control de inventario en tiempo real.

**Responsabilidades:**
- Stock actual por producto.
- Movimientos de stock con trazabilidad (origen: venta, compra, ajuste, devolución).
- Alertas de stock bajo mínimo.
- Ajustes manuales con motivo (pérdida, vencimiento, error, robo).
- Historial de movimientos.
- Toma de inventario (recuento físico vs sistema) — v2.

**Actores:** Admin, Supervisor.

**Interfaces hacia otros módulos:**
- ← Ventas: descuento automático al confirmar venta.
- ← Compras: incremento al registrar recepción de mercadería.
- → Productos: provee cantidades actuales para display en POS.

---

### M05 — COMPRAS

**Propósito:** Registro de órdenes de compra y recepción de mercadería.

**Responsabilidades:**
- Creación de órdenes de compra por proveedor.
- Registro de recepción parcial o total.
- Actualización automática de stock al recepcionar.
- Registro de factura del proveedor (número, fecha, total).
- Historial de compras por proveedor y por producto.

**Actores:** Admin, Supervisor.

**Interfaces hacia otros módulos:**
- → Stock: incrementa stock al recepcionar.
- ← Proveedores: asocia compras con proveedores.
- ← Productos: selección de ítems a comprar.
- → Caja/Contabilidad: registra egreso (en v2).

---

### M06 — PROVEEDORES

**Propósito:** Directorio y gestión de proveedores.

**Responsabilidades:**
- Alta y mantenimiento de proveedores.
- Datos fiscales (CUIT, razón social, condición IVA).
- Datos de contacto (teléfono, email, dirección, vendedor asignado).
- Productos habituales asociados.
- Historial de compras.
- Condiciones de pago habituales.

**Actores:** Admin.

---

### M07 — CAJA

**Propósito:** Control del flujo de efectivo diario.

**Responsabilidades:**
- Apertura de caja con monto inicial.
- Registro de ingresos por ventas (automático).
- Registro de egresos manuales (gastos, retiros).
- Cierre de caja con cuadre.
- Resumen por medio de pago.
- Historial de cierres.
- Diferencias de caja con campo de observación.

**Actores:** Cajero, Supervisor.

---

### M08 — CLIENTES

**Propósito:** Base de datos de clientes para facturación y seguimiento.

**Responsabilidades:**
- Alta y mantenimiento de clientes.
- Datos fiscales (CUIT/CUIL/DNI, razón social/nombre, condición IVA).
- Datos de contacto (teléfono, email, dirección).
- Historial de compras.
- Lista de mascotas asociadas (campo simple en v1, módulo completo en v2).
- Búsqueda por CUIT, nombre o teléfono.

**Actores:** Cajero, Admin.

---

### M09 — MASCOTAS

**Propósito:** Registro de mascotas asociadas a clientes. Útil para historial de compras de alimentos y medicamentos.

**Responsabilidades:**
- Nombre, especie, raza, fecha de nacimiento.
- Peso aproximado (para recomendar dosis/tamaño de alimento).
- Notas veterinarias o de cuidado.
- Historial de compras filtrado por mascota.

**Actores:** Cajero, Admin.

**Nota:** En Fase 1 se implementa como campo simple dentro del perfil del cliente. El módulo completo (con historial, alertas de vacunas, etc.) va en Fase 2.

---

### M10 — REPORTES

**Propósito:** Visualización de datos operativos y de negocio.

**Reportes Fase 1 (básicos):**
- Ventas del día / semana / mes.
- Ranking de productos más vendidos.
- Stock bajo mínimo.
- Cierre de caja diario.
- Listado de facturas emitidas.

**Reportes Fase 2 (analíticos):**
- Análisis de márgenes por producto.
- Evolución de ventas mensual/anual.
- Ventas por cliente (top clientes).
- Comparativa períodos.
- Compras vs ventas (rotación).

**Actores:** Admin, Supervisor.

---

### M11 — USUARIOS Y PERMISOS

**Propósito:** Gestión de accesos al sistema.

**Responsabilidades:**
- Alta y baja de usuarios.
- Asignación de roles.
- Cambio de contraseña.
- Log de accesos.
- Sesiones activas.

**Roles predefinidos:**

| Rol | Accesos |
|---|---|
| `admin` | Todo el sistema |
| `supervisor` | Ventas, Stock, Reportes, Caja, Clientes |
| `cajero` | Solo Ventas y Caja |

**Actores:** Admin únicamente.

---

### M12 — CONTABILIDAD Y EXPORTACIONES

**Propósito:** Generación de archivos para el contador externo.

**Responsabilidades Fase 1:**
- Exportación de Libro IVA Ventas (CSV/XLSX).
- Exportación de Libro IVA Compras (CSV/XLSX).
- Listado de facturas emitidas por período (CSV).
- Listado de comprobantes de proveedores por período (CSV).

**Responsabilidades Fase 2:**
- Exportación de movimientos de caja.
- Libro Diario simplificado.
- Compatibilidad con formato SIAP (a definir con contador).

**Actores:** Admin.

**Nota importante:** Antes de desarrollar este módulo, reunirse con el contador del negocio para definir exactamente qué formatos necesita. No asumir.
