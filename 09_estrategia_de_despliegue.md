# Estrategia de Despliegue — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## 1. Principios de Despliegue

1. **Todo deploy es desde código.** Nadie sube nada manualmente al dashboard de Cloudflare.
2. **Ningún secreto en el repositorio.** Certificados, passwords y API keys solo en Cloudflare Secrets o GitHub Secrets.
3. **Producción solo desde `main`.** Nunca desde una rama de feature.
4. **Deploy atómico.** Si falla algún step del pipeline, nada llega a producción.
5. **Rollback en menos de 5 minutos.** Cloudflare Pages y Workers soportan rollback inmediato a versión anterior.

---

## 2. Ambientes

| Ambiente | Branch | URL | Base de datos | ARCA |
|---|---|---|---|---|
| `development` | local | `localhost:5173` | D1 local (Wrangler) | Homologación |
| `staging` | `dev` | `staging.dorothea.pages.dev` | D1 staging (separada) | Homologación |
| `production` | `main` | `erp.dorothea.com.ar` | D1 producción | Producción |

**Regla crítica:** Las bases de datos de staging y producción son **completamente separadas**. No hay ningún mecanismo que conecte datos entre ellas.

---

## 3. Pipeline de CI/CD

### Diagrama del Pipeline

```
Developer hace push
         │
         ▼
┌────────────────────────────────────┐
│         GitHub Actions CI          │
│                                    │
│  1. Instalar dependencias (pnpm)   │
│  2. TypeScript check (tsc --noEmit)│
│  3. Lint (ESLint)                  │
│  4. Tests unitarios (Vitest)       │
│  5. Tests integración (Miniflare)  │
│                                    │
│  Si falla cualquier step → ❌ STOP │
└─────────────────────┬──────────────┘
                      │ Todo OK ✅
                      ▼
         ┌────────────────────────┐
         │  ¿Es push a `dev`?     │
         └────┬──────────┬────────┘
              │ SÍ       │ NO (feature branch)
              ▼          ▼
    Deploy a Staging   Solo CI, no deploy
              │
              ▼
    ┌─────────────────────────┐
    │  Deploy Workers → staging│
    │  Deploy Pages → staging  │
    │  Migrar D1 staging       │
    └─────────────────────────┘
              │
    [Manual: QA + UAT en staging]
              │
              ▼
    Pull Request: staging → main
              │
              ▼
    ┌─────────────────────────┐
    │  Deploy Workers → prod  │
    │  Deploy Pages → prod    │
    │  Migrar D1 producción   │
    └─────────────────────────┘
```

### Archivo GitHub Actions — CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm test:integration
```

### Archivo GitHub Actions — Deploy a Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging

on:
  push:
    branches: [dev]

jobs:
  deploy:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile

      - name: Deploy Worker
        run: pnpm --filter worker wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Run D1 Migrations (staging)
        run: pnpm --filter db migrate:staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy Pages
        run: pnpm --filter web build && npx wrangler pages deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 4. Gestión de Migraciones de Base de Datos

### Principio

Las migraciones son unidireccionales y acumulativas. No se editan migraciones ya ejecutadas.

### Nomenclatura

```
migrations/
  0001_initial_schema.sql
  0002_add_product_images.sql
  0003_add_invoice_cae.sql
  0004_add_cash_movements_category.sql
```

### Proceso de migración en deploy

1. Cada migración se ejecuta solo una vez por base de datos.
2. D1 guarda un registro interno de migraciones ejecutadas.
3. El comando `wrangler d1 migrations apply` ejecuta solo las pendientes.
4. Las migraciones se ejecutan **antes** del deploy del Worker nuevo.

### Reglas de migración segura

- **Nunca eliminar columnas en producción de manera directa.** Proceso: 1) Deploy del código sin usar la columna, 2) Luego ejecutar la migración que la borra.
- **Nunca renombrar columnas.** Agregar columna nueva, migrar datos, eliminar la vieja en dos deploys separados.
- **Siempre con `NOT NULL` y DEFAULT** en columnas nuevas para no romper registros existentes.

---

## 5. Gestión de Secretos

### Secretos en desarrollo local

Archivo `.dev.vars` (no commitear, en `.gitignore`):

```
JWT_SECRET=dev-secret-key-cambiar-en-produccion
ARCA_CERT_ENCRYPTION_KEY=dev-key
```

### Secretos en Cloudflare Workers

```bash
# Configurar desde CLI (no desde dashboard)
wrangler secret put JWT_SECRET --env production
wrangler secret put ARCA_CERT_ENCRYPTION_KEY --env production
```

### Secretos en GitHub Actions

Configurados en GitHub → Settings → Secrets:
- `CLOUDFLARE_API_TOKEN`: Token de Cloudflare para deploys.
- `CLOUDFLARE_ACCOUNT_ID`: ID de la cuenta.

### Lo que NUNCA va en el repositorio

- Certificados X.509 de ARCA (`.pem`, `.key`, `.p12`).
- Claves privadas RSA.
- Passwords de producción.
- Tokens de API.
- `.env` de producción.

Los certificados ARCA se cargan una sola vez via un endpoint protegido de administración y se almacenan cifrados en KV.

---

## 6. Rollback

### Frontend (Cloudflare Pages)

Cloudflare Pages mantiene historial de deployments. Rollback inmediato desde el dashboard o CLI:

```bash
wrangler pages deployment rollback --project-name dorothea-erp
```

### Backend (Cloudflare Workers)

```bash
# Ver versiones desplegadas
wrangler deployments list

# Rollback a versión anterior
wrangler rollback
```

### Base de Datos (D1)

No hay rollback automático de migraciones. Por eso:

1. Backup manual antes de cada migración de producción con cambios destructivos.
2. Para rollbacks de datos: restaurar desde el backup nocturno en R2.
3. Para rollbacks de esquema: escribir una migración de "revertir".

---

## 7. Backup y Recuperación

### Backup Automático

Cron Trigger diario (2:00 AM Argentina) ejecuta:

```
1. Export de D1 → SQL dump
2. Comprimir el dump
3. Upload a R2: backups/db/{YYYY-MM-DD}/backup.sql.gz
4. Eliminar backups con más de 30 días
```

### Backup Manual (recomendado antes de migraciones)

```bash
wrangler d1 export dorothea-db --output backup-manual-$(date +%Y%m%d).sql
```

### Tiempo de Recuperación Estimado (RTO)

| Escenario | Tiempo estimado |
|---|---|
| Rollback de Worker (sin DB) | < 2 minutos |
| Rollback de frontend | < 1 minuto |
| Restaurar datos desde backup R2 | 15-30 minutos |
| Recuperación de disaster total | 1-2 horas |

---

## 8. Monitoreo Post-Deploy

### Checklist post-deploy a producción

- [ ] Verificar que el Worker responde en `/api/v1/health`.
- [ ] Verificar que el login funciona.
- [ ] Hacer una búsqueda de producto en el POS.
- [ ] Verificar que ARCA responde (health check interno).
- [ ] Revisar logs de Cloudflare Workers durante los primeros 15 minutos.

### Alertas

Configurar en Cloudflare:
- Alerta si la tasa de error del Worker supera el 1%.
- Alerta si el tiempo de respuesta P95 supera los 3 segundos.
- Alerta si la Queue de ARCA tiene más de 50 mensajes sin procesar.

---

## 9. Configuración de Dominio

```
erp.dorothea.com.ar      → CNAME → dorothea-erp.pages.dev
api.dorothea.com.ar      → Cloudflare Workers custom domain
```

SSL/TLS: automático via Cloudflare (certificado gestionado por Cloudflare, renovación automática).

---

## 10. Costos Estimados de Infraestructura

| Servicio | Plan | Costo estimado/mes |
|---|---|---|
| Cloudflare Workers (Paid) | $5/mes | $5 USD |
| Cloudflare Pages | Incluido en Workers Paid | $0 |
| Cloudflare D1 (25M rows/mes incluidos) | Incluido | $0 |
| Cloudflare R2 (10GB incluidos) | Incluido | ~$0 |
| Cloudflare KV (1M reads incluidos) | Incluido | ~$0 |
| Cloudflare Queues (1M mensajes incluidos) | Incluido | ~$0 |
| **Total estimado** | | **~$5 USD/mes** |

Para una tienda de mascotas pequeña, este es un costo de infraestructura mínimo. Si el volumen de datos crece significativamente (miles de productos, años de historial), puede llegar a $10-15 USD/mes.
