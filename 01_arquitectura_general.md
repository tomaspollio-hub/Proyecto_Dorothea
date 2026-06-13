# Arquitectura General del Sistema — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## 1. Visión General

Dorothea ERP es una aplicación web full-stack desplegada completamente sobre la infraestructura de Cloudflare. No existe servidor propio, no hay instancias EC2, no hay bases de datos self-hosted. Todo corre en el edge.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE                          │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  Cloudflare       │    │         Cloudflare Workers       │  │
│  │  Pages            │◄──►│         (API Gateway)            │  │
│  │  (React SPA)      │    │         Hono.js Router           │  │
│  └──────────────────┘    └──────────────┬───────────────────┘  │
│                                         │                       │
│              ┌──────────────────────────┼──────────────┐        │
│              │                          │              │        │
│              ▼                          ▼              ▼        │
│  ┌──────────────────┐  ┌────────────────────┐  ┌────────────┐  │
│  │  Cloudflare D1   │  │  Cloudflare KV     │  │     R2     │  │
│  │  (Base de datos  │  │  (Cache + Sessions │  │  (Storage  │  │
│  │   principal)     │  │   + Config ARCA)   │  │   Imágenes │  │
│  └──────────────────┘  └────────────────────┘  │   PDFs)    │  │
│                                                 └────────────┘  │
│              ┌──────────────────────────┐                       │
│              │  Cloudflare Queues       │                       │
│              │  (ARCA async, Emails)    │                       │
│              └──────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (fetch)
                              ▼
                   ┌────────────────────┐
                   │  ARCA Web Services │
                   │  (WSFEv1 + WSAA)   │
                   │  wsfe.afip.gov.ar  │
                   └────────────────────┘
```

---

## 2. Capas de la Arquitectura

### Capa de Presentación — Cloudflare Pages + React

- **Framework:** React 18 con Vite como bundler.
- **Routing:** React Router v6 (client-side routing).
- **Estado global:** Zustand (ligero, sin boilerplate).
- **Data fetching:** TanStack Query (caché de servidor, invalidación automática).
- **UI Components:** Radix UI + Tailwind CSS (accesible, headless, customizable).
- **Forms:** React Hook Form + Zod (validación en cliente).
- **Deploy:** Cloudflare Pages (CDN global, deploys atómicos, preview environments).

**Decisiones de diseño del frontend:**
- SPA pura. No SSR. El POS debe funcionar incluso con conectividad intermitente (PWA en v2).
- La UI del POS (punto de venta) es una ruta/vista separada optimizada para velocidad táctil.
- Shortcuts de teclado en el POS para operadores de mostrador.

### Capa de API — Cloudflare Workers + Hono.js

- **Runtime:** Cloudflare Workers (V8 Isolates, edge computing).
- **Router:** Hono.js v4 (TypeScript, middleware pattern, compatible con Workers).
- **Autenticación:** JWT firmados con `HMAC-SHA256` via Web Crypto API (disponible nativa en Workers).
- **Validación:** Zod en cada endpoint (no se confía en el frontend).
- **Rate limiting:** Cloudflare Rate Limiting Rules (configuradas en el dashboard).
- **CORS:** Configurado explícitamente, solo el dominio de Pages.

**Estructura de la API:**
```
/api/v1/
  /auth/          → login, logout, refresh
  /products/      → CRUD productos
  /inventory/     → movimientos de stock
  /sales/         → ventas y tickets
  /invoices/      → facturación ARCA
  /customers/     → clientes
  /cash-register/ → caja
  /suppliers/     → proveedores
  /purchases/     → compras
  /reports/       → reportes
  /users/         → gestión de usuarios
```

### Capa de Datos — Cloudflare D1

- **Motor:** SQLite (via D1, managed by Cloudflare).
- **Migraciones:** Versionadas con numeración secuencial (`001_initial.sql`, `002_add_index.sql`).
- **ORM:** Drizzle ORM (TypeScript-first, genera SQL optimizado, compatible con D1).
- **Backup:** Cloudflare D1 tiene backup automático. Adicionalmente, export nocturno a R2 via Cron Trigger.

### Capa de Cache — Cloudflare KV

Usos específicos:
| Key | Contenido | TTL |
|---|---|---|
| `session:{token}` | Datos de sesión del usuario | 8 horas |
| `catalog:products` | Lista de productos (lectura rápida POS) | 5 minutos |
| `arca:token:{cuit}` | Token de autenticación ARCA (TA) | 12 horas |
| `arca:cert:{cuit}` | Certificado X.509 cifrado | Sin TTL |
| `config:store` | Configuración general de la tienda | Sin TTL |

### Capa de Storage — Cloudflare R2

Estructura de buckets:
```
dorothea-prod/
  products/images/{product_id}.webp
  invoices/pdf/{year}/{month}/{invoice_number}.pdf
  backups/db/{date}/backup.sql
  imports/suppliers/{filename}.csv
```

### Capa Asíncrona — Cloudflare Queues

Flujos asíncronos:
- `arca-invoice-queue`: Cola para solicitud de CAE a ARCA (evita timeouts en el POS).
- `pdf-generation-queue`: Generación de PDFs de facturas post-venta.
- `stock-alert-queue`: Notificaciones de stock bajo mínimo.

---

## 3. Arquitectura de Seguridad

### Autenticación y Autorización

```
Usuario → Login → Worker Auth → Valida en D1 → Genera JWT → KV session
         ↑                                                          ↓
         └──────────────── Cada request valida JWT ←───────────────┘
```

- Tokens JWT de 8 horas. Refresh tokens de 30 días en KV.
- RBAC (Role-Based Access Control): roles `admin`, `cashier`, `supervisor`.
- Cada endpoint valida el rol requerido via middleware Hono.

### Protección de Datos Sensibles

- **Certificados ARCA:** Almacenados cifrados en KV con clave derivada del `CUIT + secret` del entorno.
- **Contraseñas:** `bcrypt` con salt factor 12 (via WebAssembly en Workers).
- **CUIT/DNI de clientes:** Sin cifrado adicional en DB (es dato fiscal no secreto), pero con acceso restringido por rol.
- **Variables de entorno:** Secrets de Workers (nunca en código).

### HTTPS y Headers de Seguridad

Configurados en Cloudflare Pages:
```
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 4. Arquitectura del Módulo ARCA (detalle)

Por su complejidad, ARCA tiene su propia sub-arquitectura:

```
Venta completada
      │
      ▼
Worker Principal
      │ encola en
      ▼
Cloudflare Queue (arca-invoice-queue)
      │
      ▼
Worker ARCA Consumer
      │
      ├─ 1. Obtiene Token de Autorización (TA) desde KV
      │       │ si vencido → llama WSAA → firma con cert → guarda en KV
      ├─ 2. Construye XML del comprobante (WSFEv1)
      ├─ 3. POST a wsfe.afip.gov.ar/wsfev1/service.asmx
      ├─ 4. Recibe CAE + vencimiento
      ├─ 5. Guarda en D1 (facturas.cae, facturas.cae_vencimiento)
      ├─ 6. Encola generación de PDF
      └─ 7. Notifica al frontend via estado de la venta
```

**Manejo de errores ARCA:**
- Error de red: reintento automático (3 veces, backoff exponencial).
- Error de validación AFIP (código 10xxx): registrar en log, marcar factura como "error", alertar admin.
- Contingencia: si ARCA está caído, permitir venta con "Comprobante de Venta" no fiscal y facturar al recuperar conectividad (modo CAEA si se implementa en v2).

---

## 5. Diagrama de Flujo — Venta con Factura

```
Cajero busca producto
         │
         ▼
Agrega al carrito (estado local React)
         │
         ▼
Selecciona cliente (o "Consumidor Final")
         │
         ▼
Elige medio de pago
         │
         ▼
POST /api/v1/sales  ──► Worker valida stock
         │                      │
         │               Descuenta stock (D1)
         │               Registra venta (D1)
         │               Registra movimiento caja (D1)
         │               Encola ARCA (Queue)
         │                      │
         ▼                      ▼
Ticket de venta         Worker ARCA obtiene CAE
mostrado en pantalla    PDF generado → R2
                        Factura disponible para imprimir/email
```

---

## 6. Consideraciones de Performance

- **Búsqueda de productos en POS:** Cache en KV (5 min). Para el POS, velocidad > frescura.
- **Consultas D1:** Índices en `product_code`, `customer_cuit`, `sale_date`, `invoice_number`.
- **Cold starts:** Workers tienen cold start de ~5ms. Aceptable para uso en tienda.
- **Límites D1:** 100k reads/día (plan gratuito) → con Workers Paid: 25M reads incluidos. Suficiente para una tienda.

---

## 7. Infraestructura como Código

Toda la configuración de Cloudflare se versionará en el repositorio:

```
wrangler.toml          → configuración de Workers y bindings
wrangler.prod.toml     → overrides de producción
migrations/            → scripts SQL versionados
```

No se usa el dashboard de Cloudflare para configuración crítica. Todo reproducible desde código.
