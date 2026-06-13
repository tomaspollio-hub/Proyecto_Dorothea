# SETUP — Dorothea ARCA Spike

Guía completa para configurar, correr y validar el spike de integración ARCA.

---

## Requisitos Previos

- Node.js >= 18
- pnpm (o npm/yarn)
- Cuenta en Cloudflare (plan free es suficiente)
- CUIT habilitado para servicios web ARCA (o CUIT de prueba)
- Wrangler CLI autenticado: `wrangler login`

---

## Sección 1 — Instalación

```bash
cd spike-arca
pnpm install
```

Verificar TypeScript:
```bash
pnpm typecheck
```

Si hay errores de tipos en `node-forge`, ejecutar:
```bash
pnpm add -D @types/node-forge
```

---

## Sección 2 — Obtener Certificados ARCA (Homologación)

Hay dos caminos. El **Camino A** es el correcto para un spike real.

### Camino A — Certificado real de ARCA Homologación (Recomendado)

Este proceso genera un certificado firmado por la CA de ARCA Homologación.
Es el único que funciona con el WSAA de homologación.

**Paso 1: Generar el par de claves RSA y el CSR**

```bash
# Crear directorio seguro para los certificados (NUNCA en el repo)
mkdir -p ~/arca-certs && cd ~/arca-certs

# Generar clave privada RSA 2048 bits
openssl genrsa -out private.key 2048

# Verificar la clave
openssl rsa -in private.key -check

# Crear el CSR (Certificate Signing Request)
# Reemplazar los valores entre <> con los datos reales del negocio
openssl req -new -key private.key -out request.csr \
  -subj "/C=AR/O=Dorothea Pet Shop/CN=CUIT <CUIT_SIN_GUIONES>/serialNumber=CUIT <CUIT_CON_GUIONES>"

# Ejemplo real:
# openssl req -new -key private.key -out request.csr \
#   -subj "/C=AR/O=Dorothea Pet Shop/CN=CUIT 20123456789/serialNumber=CUIT 20-12345678-9"

# Verificar el CSR
openssl req -text -noout -in request.csr
```

**Paso 2: Registrar el CSR en el portal ARCA Homologación**

1. Ir a: https://homo.afip.gob.ar/rcel/
   (o el portal actual: puede cambiar, buscar "WSAA Homologación ARCA")
2. Ingresar con CUIT y Clave Fiscal (nivel 2 o superior).
3. Ir a: **Servicios Online → Administración de Certificados Digitales**
4. Seleccionar **"Agregar Alias"** o **"Nuevo Certificado"**.
5. Pegar el contenido del archivo `request.csr` (incluyendo los headers BEGIN/END).
6. Completar la alias (nombre identificatorio, ej: "dorothea-erp-spike").
7. Descargar el certificado generado → guardarlo como `certificate.pem`.

**Paso 3: Verificar el certificado**

```bash
# Ver datos del certificado
openssl x509 -in certificate.pem -text -noout

# Verificar que el certificado corresponde a la clave privada
# (los hashes deben ser iguales)
openssl x509 -noout -modulus -in certificate.pem | openssl md5
openssl rsa -noout -modulus -in private.key | openssl md5
```

**Paso 4: Habilitar el servicio wsfe en ARCA**

En el mismo portal ARCA:
1. Ir a Servicios Online → Servicios Web → Administrar Servicios.
2. Buscar **"wsfe"** (Facturación Electrónica).
3. Asociarlo al alias/certificado que creaste.

Sin este paso, WSAA dará error "CUIT no habilitado para el servicio".

---

### Camino B — Certificado autofirmado para pruebas básicas de firma

⚠️ Este certificado NO funciona con el WSAA de ARCA (ARCA verifica que el certificado
esté registrado). Sirve SOLO para testear que `signTRACMS()` funciona correctamente
antes de tener el certificado real.

```bash
mkdir -p ~/arca-certs && cd ~/arca-certs

openssl genrsa -out private.key 2048

openssl req -new -x509 -key private.key -out certificate.pem -days 365 \
  -subj "/C=AR/O=Test/CN=CUIT 20000000000/serialNumber=CUIT 20-00000000-0"
```

Con este certificado, el endpoint `POST /api/arca/wsaa/login` fallará con un error
de WSAA_SOAP_FAULT (certificado no registrado), pero el paso de firma CMS sí se puede
validar mirando los logs del Worker.

---

## Sección 3 — Configurar Secrets en Cloudflare

Los secrets NO deben estar en el código ni en `.dev.vars` para producción.

### Para desarrollo local (`.dev.vars`)

```bash
cp .dev.vars.example .dev.vars
```

Editar `.dev.vars` con los valores reales:

```
ARCA_CUIT=20123456789

# Opción A: pegar el PEM directamente (múltiples líneas funcionan en .dev.vars)
ARCA_CERT=-----BEGIN CERTIFICATE-----
MIIDBTCCAe2gAwIBAgIU...
-----END CERTIFICATE-----

ARCA_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
```

**Truco para PEM en .dev.vars sin errores de parsing:**

Si Wrangler tiene problemas con el PEM multilínea en `.dev.vars`,
usar la versión de una sola línea con `\n` literal:

```bash
# Convertir PEM a una línea (para .dev.vars)
awk 'NF {printf "%s\\n", $0}' ~/arca-certs/certificate.pem
```

Y pegar el resultado como:
```
ARCA_CERT=-----BEGIN CERTIFICATE-----\nMIIDBT...\n-----END CERTIFICATE-----
```

El código en `config.ts` maneja ambos formatos automáticamente (`normalizePem`).

### Para Cloudflare Workers (Wrangler Secrets)

Los secrets de Cloudflare Workers se cargan con `wrangler secret put`.
Para valores multilinea (como PEM), usar stdin:

```bash
# Cargar CUIT
wrangler secret put ARCA_CUIT
# (escribe el valor y presiona Enter, luego Ctrl+D)

# Cargar certificado (desde archivo)
wrangler secret put ARCA_CERT < ~/arca-certs/certificate.pem

# Cargar clave privada (desde archivo)
wrangler secret put ARCA_PRIVATE_KEY < ~/arca-certs/private.key
```

**Verificar que los secrets están cargados:**
```bash
wrangler secret list
```

---

## Sección 4 — Correr Localmente

```bash
pnpm dev
```

Wrangler levanta el Worker en `http://localhost:8787`.

**Endpoints de prueba:**

```bash
# 1. Health check
curl http://localhost:8787/

# 2. Verificar configuración y estado del certificado (NO llama a ARCA)
curl http://localhost:8787/api/arca/status | jq

# 3. Autenticar contra WSAA (llama a ARCA Homologación)
curl -X POST http://localhost:8787/api/arca/wsaa/login | jq

# 4. Consultar último comprobante (flujo completo: WSAA + WSFEv1)
curl "http://localhost:8787/api/arca/wsfe/ultimo-comprobante?pto_vta=1&cbte_tipo=6" | jq

# Otros tipos de comprobante:
curl "http://localhost:8787/api/arca/wsfe/ultimo-comprobante?pto_vta=1&cbte_tipo=11" | jq  # Factura C
```

---

## Sección 5 — Deployar a Cloudflare

```bash
# Deploy al ambiente default (wrangler.toml)
pnpm deploy

# La URL del Worker aparece en el output:
# https://dorothea-arca-spike.TU-CUENTA.workers.dev
```

Después del deploy, verificar:

```bash
WORKER_URL=https://dorothea-arca-spike.TU-CUENTA.workers.dev

curl $WORKER_URL/api/arca/status | jq
curl -X POST $WORKER_URL/api/arca/wsaa/login | jq
```

---

## Sección 6 — Errores Esperados y Diagnóstico

### Error: `CMS_CERT_PARSE_ERROR`

```json
{ "code": "CMS_CERT_PARSE_ERROR", "error": "No se pudo parsear el certificado PEM" }
```

**Causas:**
- El PEM tiene los saltos de línea como `\n` literal en vez de newlines reales.
  → El código intenta normalizar automáticamente, pero si falló es que el formato es raro.
- El certificado está incompleto (falta el header `-----BEGIN CERTIFICATE-----`).
- El archivo tiene BOM (Byte Order Mark) al inicio.

**Diagnóstico:**
```bash
# Verificar que el PEM es válido localmente
openssl x509 -in ~/arca-certs/certificate.pem -text -noout

# Verificar que no tiene BOM
file ~/arca-certs/certificate.pem
# Debe decir "PEM certificate" o "ASCII text"
```

---

### Error: `CMS_KEY_PARSE_ERROR`

```json
{ "code": "CMS_KEY_PARSE_ERROR", "error": "No se pudo parsear la clave privada PEM" }
```

**Causas:**
- Mismo problema de saltos de línea que el certificado.
- La clave está cifrada con passphrase (ARCA no soporta claves cifradas en los workers).

**Verificar:**
```bash
# Si la clave tiene passphrase, verás "ENCRYPTED" en el header
head -1 ~/arca-certs/private.key
# Debe decir: -----BEGIN RSA PRIVATE KEY-----
# NO debe decir: -----BEGIN ENCRYPTED PRIVATE KEY-----

# Remover passphrase si existe:
openssl rsa -in private_with_passphrase.key -out private.key
```

---

### Error: `WSAA_SOAP_FAULT` — "El certificado no está habilitado para este servicio"

```json
{ "code": "WSAA_SOAP_FAULT", "error": "WSAA SOAP Fault: El certificado no..." }
```

**Causa:** El certificado existe en ARCA pero el servicio `wsfe` no está asociado a él.

**Solución:** Ir al portal ARCA → Administrar Servicios → Asociar `wsfe` al alias del certificado.

---

### Error: `WSAA_SOAP_FAULT` — "El certificado no pertenece a este CUIT"

**Causa:** El CUIT en `ARCA_CUIT` no coincide con el CUIT en el CN del certificado,
o el certificado no fue generado para ese CUIT.

**Verificar:**
```bash
openssl x509 -in certificate.pem -subject -noout
# La salida debe incluir el CUIT: CN = CUIT 20123456789
```

---

### Error: `WSAA_SOAP_FAULT` — "TRA expirado"

**Causa:** El clock del Worker está muy desfasado del servidor ARCA.
Los Workers de Cloudflare tienen clock correcto, pero si el generationTime está
muy en el pasado ARCA lo rechaza.

**Nota:** El TRA se genera con `generationTime = ahora - 5min` como tolerancia.
Si el error persiste, verificar que el sistema donde corre Wrangler tiene la hora correcta.

---

### Error: `WSFE_API_ERROR` — Código 16: "No existe tipo de comprobante"

**Causa normal:** El punto de venta (pto_vta) no tiene habilitado el tipo de comprobante
solicitado. Por ejemplo, un PV tipo "Exportación" no puede emitir Factura B.

**Diagnóstico:** En el portal ARCA, verificar la configuración del punto de venta 1.

---

### Error: `WSAA_HTTP_ERROR` o `WSFE_HTTP_ERROR` — Timeout

**ARCA tiene alta latencia y caídas frecuentes**, especialmente en homologación.
El timeout del Worker está configurado en 30 segundos.

**Diagnóstico:**
```bash
# Verificar disponibilidad de ARCA Homologación
curl -I https://wsaahomo.afip.gov.ar/ws/services/LoginCms
curl -I https://wswhomo.afip.gov.ar/wsfev1/service.asmx

# Si responde con 200, el servicio está up
# Si hay timeout, esperar y reintentar (esto es normal en homologación)
```

**Status page no oficial:** Varios grupos de desarrolladores AR monitorean ARCA.
Buscar "status AFIP WSAA" en Twitter/X o el grupo de Telegram de desarrolladores ARCA.

---

### Error de bundling de node-forge

Si `pnpm dev` falla con un error relacionado a `node-forge` (CommonJS/ESM mismatch):

```bash
# Opción 1: Agregar externals en wrangler.toml
# (no funciona: node-forge no está disponible en Workers como módulo nativo)

# Opción 2: Forzar el formato CommonJS en el bundle
# En wrangler.toml, agregar:
# [build]
# command = "esbuild src/index.ts --bundle --format=cjs --outfile=dist/worker.js --platform=node"
# [build.upload]
# format = "service-worker"
# main = "dist/worker.js"
```

Si el problema persiste, usar `pkijs` en lugar de `node-forge`:
```bash
pnpm remove node-forge @types/node-forge
pnpm add pkijs asn1js
# Y reemplazar cms.ts con la implementación pkijs (ver comentario al final de cms.ts)
```

---

## Sección 7 — Checklist de Validación

Completar en orden. Cada checkbox es un hito de validación.

### Configuración
- [ ] `pnpm install` ejecuta sin errores
- [ ] `pnpm typecheck` sin errores TypeScript
- [ ] `GET /` responde con el JSON de endpoints
- [ ] Certificado y clave privada generados con openssl
- [ ] `.dev.vars` configurado con CUIT, CERT y PRIVATE_KEY

### Firma CMS (sin llamar a ARCA)
- [ ] `GET /api/arca/status` responde con `ok: true`
- [ ] `certificate.isExpired` es `false`
- [ ] `certificate.daysUntilExpiry` es mayor a 0
- [ ] `certificate.subject` contiene el CUIT correcto

### Autenticación WSAA
- [ ] `POST /api/arca/wsaa/login` responde con `ok: true`
- [ ] `token.isPresent` es `true`
- [ ] `token.tokenLength` es mayor a 100 caracteres
- [ ] `timing.wsaaMs` tiene un valor razonable (500ms - 10000ms según el estado de ARCA)

### Consulta WSFEv1
- [ ] `GET /api/arca/wsfe/ultimo-comprobante?pto_vta=1&cbte_tipo=6` responde con `ok: true`
- [ ] `resultado.nroComprobante` es un número (puede ser -1 si es la primera vez)
- [ ] `resultado.proximoComprobante` es el número correcto

### Deploy a Cloudflare
- [ ] `pnpm deploy` completa sin errores
- [ ] `GET https://worker-url/api/arca/status` responde correctamente desde Cloudflare
- [ ] `POST https://worker-url/api/arca/wsaa/login` responde con `ok: true` desde Cloudflare

### Criterio de éxito de la Fase 0
**El spike es exitoso cuando `GET /api/arca/wsfe/ultimo-comprobante` responde con `ok: true`
tanto en desarrollo local como en el Worker deployado en Cloudflare.**

Esto valida que:
✅ node-forge funciona correctamente en Workers con nodejs_compat
✅ La firma CMS/PKCS7 es aceptada por ARCA
✅ WSAA devuelve un Token de Acceso válido
✅ WSFEv1 acepta el token y responde correctamente
✅ El Worker puede hacer fetch() HTTPS a servicios externos de Argentina desde Cloudflare edge

---

## Sección 8 — Próximos Pasos (después del spike exitoso)

Una vez que el checklist está completo:

1. **Documentar los tiempos de respuesta observados** (wsaaMs, totalMs).
   Esto determina si necesitamos aumentar el timeout.

2. **Commit del spike** con los resultados en el mensaje de commit.

3. **Iniciar Fase 0 del ERP**: setup del monorepo con pnpm workspaces,
   estructura de carpetas del documento `06_estructura_de_carpetas.md`,
   y migrar el módulo ARCA del spike al Worker principal.

4. **Agregar caching del TA en KV**: el token ARCA dura ~12 horas.
   En el ERP, almacenarlo en KV para no hacer loginCms en cada request.
