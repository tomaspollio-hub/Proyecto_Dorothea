# Análisis Crítico y Recomendaciones — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Rol:** CTO / Software Architect Senior

---

## 1. Evaluación Honesta del Alcance

Antes de diseñar, hay que decir lo que no es conveniente callar:

**12 módulos en un primer desarrollo es demasiado.**

Un ERP con facturación ARCA, módulo contable, módulo de mascotas, reportes avanzados y gestión de compras desarrollado en paralelo desde cero es un proyecto de 18-24 meses para un equipo de 3-4 personas. Intentarlo como proyecto unipersonal o con equipo pequeño sin fasearlo lleva al abandono.

La buena noticia: el negocio de una pet shop tiene un núcleo muy bien definido que se puede entregar en 3-4 meses con valor real.

---

## 2. Análisis Módulo por Módulo

| Módulo | Prioridad Real | Complejidad | Riesgo |
|---|---|---|---|
| Ventas (POS) | CRÍTICA | Media | Bajo |
| Facturación ARCA | CRÍTICA | **Muy Alta** | **Alto** |
| Productos | CRÍTICA | Baja | Bajo |
| Stock | CRÍTICA | Media | Bajo |
| Caja | CRÍTICA | Media | Bajo |
| Clientes | Alta | Baja | Bajo |
| Compras | Media | Media | Medio |
| Proveedores | Media | Baja | Bajo |
| Mascotas | Media | Baja | Bajo |
| Usuarios y permisos | Alta | Media | Medio |
| Reportes | Baja | Alta | Medio |
| Contabilidad / Exportaciones | Baja | **Alta** | **Alto** |

---

## 3. Riesgos Críticos Identificados

### 3.1 ARCA es el mayor riesgo técnico del proyecto

- Los Web Services de ARCA (WSFEv1 + WSAA) usan SOAP/XML con certificados X.509.
- La autenticación requiere firmar un XML con una clave privada RSA → complejo en Workers.
- Los ambientes de homologación/testing de ARCA son inestables y lentos.
- Las especificaciones oficiales están desactualizadas y llenas de casos edge.
- **Recomendación:** Aislar ARCA en un Worker dedicado desde el día 1. Reservar 6-8 semanas solo para esta integración. Considerar un middleware externo (ej. `facturapi.io` o `afipsdk`) en la fase inicial para no bloquear el resto del desarrollo.

### 3.2 Cloudflare D1 tiene limitaciones reales

- D1 es SQLite. Tiene un límite de escrituras concurrentes (no hay WAL distribuido real).
- Para una tienda con una sola caja y uso secuencial: **suficiente**.
- Para múltiples cajas simultáneas o reportes analíticos pesados: puede ser un cuello de botella.
- No soporta búsqueda full-text nativa sin extensiones. Afecta búsqueda de productos.
- **Recomendación:** Diseñar el esquema para minimizar escrituras críticas simultáneas. Usar índices explícitos desde el inicio. Evaluar Cloudflare KV como cache de lecturas frecuentes (catálogo de productos).

### 3.3 Cloudflare Workers tiene límites de CPU

- Plan gratuito: 10ms CPU time por request.
- Plan pagado (Workers Paid): 30s de CPU time con Durable Objects.
- Operaciones como importación masiva de productos, generación de reportes o cálculos contables deben ir a Workers con Durable Objects o Queues.
- **Recomendación:** Presupuestar Workers Paid desde el inicio (~$5/mes). No hay alternativa real para ARCA y procesamiento asíncrono.

### 3.4 El módulo contable es un proyecto en sí mismo

- "Exportaciones para contador" puede significar muchas cosas: IVA, Libro Diario, exportación a Tango/Bejerman, archivos SIAP, etc.
- Sin una definición precisa, este módulo puede expandirse indefinidamente.
- **Recomendación:** Reducir a "exportación de comprobantes en formato CSV/PDF + libro IVA ventas/compras" para la primera versión. Reunión con el contador del negocio antes de codificar una sola línea.

---

## 4. Recomendaciones de Simplificación

### 4.1 Stack Recomendado Final

```
Frontend:   React + Vite → Cloudflare Pages
Backend:    Cloudflare Workers (Hono.js como router)
Database:   Cloudflare D1 (SQLite)
Storage:    Cloudflare R2 (imágenes, PDFs, backups)
Auth:       JWT + Cloudflare KV (sessions)
Queue:      Cloudflare Queues (ARCA async, emails)
Cache:      Cloudflare KV (catálogo, configuración)
ARCA:       Worker dedicado + certificados en KV cifrado
```

**Por qué Hono.js:** Es el router más maduro y liviano para Workers. Tiene middleware integrado, soporte de TypeScript, y es explícitamente diseñado para edge computing.

### 4.2 Módulos del MVP (Fase 1) — Lo que realmente importa primero

Los únicos módulos que bloquean la apertura del negocio al sistema nuevo:

1. **Productos** (catálogo, precios)
2. **Stock** (movimientos básicos)
3. **Clientes** (CUIT/DNI para facturación)
4. **Ventas / POS** (el corazón del sistema)
5. **Caja** (apertura/cierre, movimientos)
6. **Facturación ARCA** (sin esto no pueden facturar)
7. **Usuarios** (al menos admin + cajero)

Con estos 7 módulos el negocio puede operar. El resto es valor agregado.

### 4.3 Decisiones de diseño que simplifican todo

- **Un solo punto de venta** en v1. Multi-sucursal es para v2.
- **Tipo de factura B y C** primero (consumidor final y monotributo). Tipo A para v2.
- **Sin multi-moneda** en v1.
- **Mascotas como campo opcional del cliente**, no módulo separado, en v1.
- **Reportes básicos** (ventas del día, stock bajo mínimo) en v1. Dashboard analítico en v2.
- **Compras y Proveedores** pueden ser manuales (importar CSV) en v1.

---

## 5. Recomendación de Equipo Mínimo

| Rol | Dedicación |
|---|---|
| Full-stack Developer (TypeScript/React) | Principal |
| Consultor ARCA/AFIP | 2-3 semanas puntual |
| Contador del negocio | Revisión mensual |
| Dueño del negocio (testing UAT) | Semanal en fase de pruebas |

---

## 6. Decisión sobre el Sistema Legado (Pascal)

El sistema Pascal actual debe seguir funcionando en paralelo durante la Fase 1 completa.

**No cortar el sistema viejo hasta que:**
- Facturación ARCA funcione correctamente en producción durante 30 días.
- Haya al menos 2 semanas de datos migrados validados.
- El cajero/operador confirme comodidad con el nuevo sistema.

**Migración de datos:** Exportar desde Pascal a CSV. Importar a D1 via script de migración. No conectar ambos sistemas directamente.

---

## 7. Lo que NO está en scope (y debe quedar documentado)

- **E-commerce / tienda online:** No en ninguna fase planificada.
- **App mobile nativa:** No en scope. El POS es web responsive.
- **Integración con balanzas electrónicas:** No en scope v1.
- **Fidelización / puntos:** No en scope v1.
- **WhatsApp automático:** No en scope v1.
- **Multi-empresa:** No en scope.
