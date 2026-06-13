# Roadmap de Desarrollo — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## Resumen Ejecutivo

| Fase | Duración | Objetivo | Estado |
|---|---|---|---|
| Fase 0 | 2 semanas | Infraestructura y base | Pendiente |
| Fase 1 | 10 semanas | MVP Operativo | Pendiente |
| Fase 2 | 8 semanas | Gestión Completa | Pendiente |
| Fase 3 | 6 semanas | Analítica y Contabilidad | Pendiente |

**Total estimado:** ~26 semanas (6 meses) para el sistema completo.  
**Sistema usable en producción:** Al finalizar Fase 1 (~12 semanas desde inicio).

---

## FASE 0 — Infraestructura y Fundamentos
### Duración: 2 semanas

**Objetivo:** Tener todo el scaffolding listo antes de escribir una sola línea de negocio.

#### Semana 1: Setup del entorno

- [ ] Crear organización en Cloudflare y configurar cuenta.
- [ ] Configurar proyecto en Cloudflare Pages (conectado a GitHub).
- [ ] Crear Worker principal con Hono.js.
- [ ] Inicializar base de datos D1 (producción + desarrollo local).
- [ ] Crear bucket R2 (imágenes y PDFs).
- [ ] Crear namespaces KV (sessions, cache, arca-config).
- [ ] Configurar Cloudflare Queues (arca-invoice, pdf-generation).
- [ ] Setup repositorio GitHub con estructura de carpetas definida.
- [ ] CI/CD: GitHub Actions → deploy automático a Cloudflare Pages y Workers.
- [ ] Configurar entornos: `development`, `staging`, `production`.

#### Semana 2: Cimientos de código

- [ ] Schema inicial de D1 (tablas base: users, sessions).
- [ ] Sistema de migraciones versionado.
- [ ] Middleware de autenticación JWT en Worker.
- [ ] Módulo Usuarios básico: login, logout, refresh token.
- [ ] Setup de Drizzle ORM con type-safety.
- [ ] Setup de Zod para validación en API.
- [ ] Frontend: estructura React + Vite + Tailwind + Router.
- [ ] Pantalla de login funcional end-to-end.
- [ ] Variables de entorno y secrets configurados correctamente.

**Criterio de salida:** Login funcional en staging. Deploy automático desde GitHub funcionando.

---

## FASE 1 — MVP Operativo
### Duración: 10 semanas

**Objetivo:** El negocio puede reemplazar el sistema Pascal para las operaciones diarias.

#### Semana 3-4: Productos y Stock

- [ ] Módulo Productos: CRUD completo.
- [ ] Gestión de categorías y subcategorías.
- [ ] Upload de imágenes a R2.
- [ ] Módulo Stock: inicialización de stock por producto.
- [ ] Movimientos de stock manuales (ajustes).
- [ ] Alertas de stock bajo mínimo (visual en dashboard).
- [ ] Script de importación de productos desde CSV (migración del sistema Pascal).

**Deliverable:** Catálogo de productos importado desde sistema legado, con stock inicial cargado.

#### Semana 5: Clientes

- [ ] Módulo Clientes: CRUD completo.
- [ ] Búsqueda por CUIT, nombre, teléfono.
- [ ] Validación de CUIT (algoritmo de verificación).
- [ ] Importación de clientes desde CSV.
- [ ] Campo simple de mascotas en perfil de cliente.

**Deliverable:** Base de clientes migrada y operativa.

#### Semana 6-7: Ventas / POS

- [ ] Layout de pantalla POS optimizado para mostrador.
- [ ] Búsqueda de productos por código de barras, código interno y nombre.
- [ ] Agregar/quitar ítems del carrito.
- [ ] Descuentos por ítem y por total.
- [ ] Selección de cliente (o Consumidor Final).
- [ ] Selección de medio de pago.
- [ ] Confirmación de venta: descuenta stock + registra en DB.
- [ ] Ticket de venta (imprimible o pantalla).
- [ ] Historial de ventas del día.
- [ ] Shortcuts de teclado documentados.

**Deliverable:** Primera venta real procesada en el sistema nuevo.

#### Semana 8: Caja

- [ ] Apertura de caja con monto inicial.
- [ ] Registro automático de ventas como ingresos.
- [ ] Egresos manuales con categoría y descripción.
- [ ] Cierre de caja con cuadre automático.
- [ ] Resumen por medio de pago.
- [ ] Historial de cierres.

**Deliverable:** Cierre de caja completo realizado en el sistema nuevo.

#### Semana 9-10: Facturación ARCA

*Esta es la semana más crítica del proyecto. Puede extenderse.*

- [ ] Configuración de certificados ARCA en KV (cifrados).
- [ ] Worker ARCA dedicado.
- [ ] Integración WSAA: obtención y renovación de Token de Autorización.
- [ ] Integración WSFEv1: emisión de Factura B.
- [ ] Integración WSFEv1: emisión de Factura C.
- [ ] Almacenamiento de CAE en DB.
- [ ] Generación de PDF de factura con datos + QR de verificación ARCA.
- [ ] PDF almacenado en R2.
- [ ] Impresión de factura desde POS.
- [ ] Manejo de errores ARCA (reintentos, alertas).
- [ ] **Testing exhaustivo en homologación ARCA antes de pasar a producción.**

**Deliverable:** Primera factura electrónica real emitida con CAE válido.

#### Semana 11-12: Integración, Testing y Pase a Producción

- [ ] Reportes básicos: ventas del día, stock bajo mínimo, facturas emitidas.
- [ ] Módulo Usuarios completo: roles, alta/baja, cambio de contraseña.
- [ ] Testing de integración end-to-end (todos los flujos de venta).
- [ ] Testing de regresión ARCA.
- [ ] Período de uso en paralelo con sistema Pascal (2 semanas).
- [ ] Capacitación del equipo de tienda.
- [ ] Resolución de bugs críticos.
- [ ] Backup inicial de datos en R2.
- [ ] Monitoreo activo post-lanzamiento.

**Criterio de salida de Fase 1:** El negocio opera completamente en el sistema nuevo durante 2 semanas sin incidentes críticos.

---

## FASE 2 — Gestión Completa
### Duración: 8 semanas

**Objetivo:** Incorporar la gestión de compras, proveedores y mascotas. Completar permisos.

#### Semana 13-14: Compras y Proveedores

- [ ] Módulo Proveedores: CRUD completo.
- [ ] Módulo Compras: órdenes de compra.
- [ ] Recepción de mercadería (actualización automática de stock).
- [ ] Registro de facturas de proveedores.
- [ ] Historial de compras por proveedor.

#### Semana 15-16: Módulo Mascotas completo

- [ ] Ficha completa de mascota (especie, raza, edad, peso, notas).
- [ ] Historial de compras filtrado por mascota.
- [ ] Alertas de seguimiento (opcionales, v2.1).

#### Semana 17-18: Facturación ARCA — Ampliación

- [ ] Soporte Factura Tipo A (RI → RI).
- [ ] Notas de Crédito B y C (devoluciones).
- [ ] Consulta de comprobantes emitidos a ARCA.
- [ ] Reenvío de facturas por email.

#### Semana 19-20: Usuarios avanzados y Refinamiento

- [ ] Log de auditoría de acciones críticas.
- [ ] Sesiones activas con revocación.
- [ ] Refinamiento de UX basado en feedback de uso real.
- [ ] Optimizaciones de performance (queries lentas identificadas en Fase 1).

---

## FASE 3 — Analítica y Contabilidad
### Duración: 6 semanas

**Objetivo:** Darle al dueño del negocio visibilidad completa y herramientas para el contador.

#### Semana 21-22: Reportes Analíticos

- [ ] Dashboard principal con KPIs del negocio.
- [ ] Ventas por período con comparativa.
- [ ] Ranking de productos más vendidos.
- [ ] Análisis de márgenes por producto/categoría.
- [ ] Rotación de stock.
- [ ] Top clientes.

#### Semana 23-24: Contabilidad y Exportaciones

- [ ] Reunión con el contador del negocio (OBLIGATORIO antes de codificar).
- [ ] Libro IVA Ventas exportable (CSV/XLSX).
- [ ] Libro IVA Compras exportable.
- [ ] Exportación de movimientos de caja.
- [ ] Listado de comprobantes por período.

#### Semana 25-26: Hardening y Optimización

- [ ] Revisión de seguridad completa.
- [ ] Optimización de costos Cloudflare.
- [ ] Documentación de usuario final.
- [ ] Plan de backup y disaster recovery documentado.
- [ ] Monitoreo con alertas automáticas.

---

## Hitos Principales

| Fecha Estimada | Hito |
|---|---|
| +2 semanas | Login funcional, infraestructura lista |
| +5 semanas | Catálogo y stock migrados del sistema viejo |
| +7 semanas | Primera venta procesada en el nuevo sistema |
| +8 semanas | Primer cierre de caja en el nuevo sistema |
| +10 semanas | Primera factura ARCA emitida en producción |
| +12 semanas | **CORTE DEL SISTEMA PASCAL — Fase 1 completa** |
| +20 semanas | Compras, proveedores y mascotas operativos |
| +26 semanas | Sistema completo con reportes y exportaciones |

---

## Buffer de Riesgo

Los tiempos anteriores asumen ejecución sin interrupciones mayores. Se recomienda:

- **+30% sobre ARCA:** Si hay problemas con los certificados o la homologación, agregar 3 semanas.
- **+20% sobre POS:** Si hay pedidos de cambio de UX post-primer uso, agregar 2 semanas.
- **+1 semana de migración de datos:** Si los datos del sistema Pascal están en mal estado.

**Estimación conservadora total:** 32-34 semanas para el sistema completo.
