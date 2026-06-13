# Riesgos Técnicos del Proyecto — Dorothea Pet Shop ERP

**Versión:** 1.0  
**Fecha:** 2026-06-05

---

## Matriz de Riesgos

| ID | Riesgo | Probabilidad | Impacto | Nivel | Mitigación |
|---|---|---|---|---|---|
| R01 | Inestabilidad de ARCA/WSAA | Alta | Crítico | CRÍTICO | Worker dedicado + reintentos + modo contingencia |
| R02 | Límites de CPU en Workers | Media | Alto | ALTO | Workers Paid + diseño asíncrono |
| R03 | Renovación de certificado ARCA vencido | Alta | Crítico | CRÍTICO | Alerta 30 días antes + proceso documentado |
| R04 | Pérdida de datos en D1 | Baja | Crítico | ALTO | Backup nocturno a R2 + export manual semanal |
| R05 | Expansión de alcance del módulo contable | Alta | Alto | ALTO | Definición acotada + reunión con contador |
| R06 | Datos inconsistentes en migración Pascal | Alta | Medio | ALTO | Script de validación + migración manual si necesario |
| R07 | Resistencia al cambio del usuario final | Media | Alto | ALTO | Período paralelo + capacitación temprana |
| R08 | Cambios regulatorios ARCA | Media | Alto | ALTO | Diseño desacoplado + monitoreo de novedades ARCA |
| R09 | Concurrencia en D1 (múltiples ventas) | Baja | Medio | MEDIO | Diseño serializado de caja |
| R10 | Falla de Cloudflare (outage) | Baja | Crítico | MEDIO | SLA Cloudflare 99.99% + plan de contingencia manual |
| R11 | Deuda técnica acumulada por velocidad | Media | Medio | MEDIO | Code review, no saltear testing |
| R12 | Expiración de sesión en medio de una venta | Baja | Alto | MEDIO | Tokens de larga duración para POS + guardar carrito |

---

## Análisis Detallado de Riesgos Críticos

---

### R01 — Inestabilidad de ARCA/WSAA

**Descripción:**  
Los web services de ARCA tienen historial documentado de caídas, lentitud extrema, y comportamientos inconsistentes especialmente en fechas de alta demanda fiscal (fin de mes, vencimientos de declaraciones).

**Escenario de falla:**  
El cajero intenta facturar, ARCA no responde, la venta queda sin factura, el cliente espera, se acumula la cola en el mostrador.

**Mitigaciones:**

1. **Arquitectura asíncrona obligatoria:** La solicitud de CAE nunca bloquea la confirmación de la venta. La venta se procesa y registra inmediatamente. La factura se emite en segundo plano (Queue).

2. **Modo contingencia documentado:** Si ARCA está caído por más de X minutos, se emite un "Comprobante de Venta" interno numerado. Al recuperar conectividad, se factura retroactivamente. *Nota: ARCA permite facturar con fecha del día, no retroactiva. Verificar normas vigentes con contador.*

3. **Reintentos automáticos:** 3 reintentos con backoff exponencial (5s, 30s, 5min) antes de marcar como error y alertar al admin.

4. **Monitor de estado:** Worker de health-check que verifica ARCA cada 5 minutos y actualiza KV. El frontend muestra un indicador de "ARCA OK/OFFLINE".

5. **Alertas al admin:** Cuando una factura lleva más de 10 minutos sin CAE, el sistema notifica.

**Plan B para producción:**  
Tener impresora de tickets térmica funcionando siempre como respaldo para comprobantes no fiscales.

---

### R03 — Certificado ARCA Vencido

**Descripción:**  
Los certificados X.509 para acceder a ARCA tienen una vigencia de 2 años. Si vencen, todo el sistema de facturación deja de funcionar sin aviso previo a los usuarios.

**Escenario de falla:**  
El día después del vencimiento, ninguna factura puede emitirse. ARCA devuelve error de certificado. No hay forma de facturar hasta renovar.

**Mitigaciones:**

1. **Alerta automática:** Cron job mensual que verifica la fecha de vencimiento del certificado almacenado en KV y envía alerta por email al admin cuando restan menos de 30 días.

2. **Proceso documentado paso a paso:** Documento en el repositorio con el proceso de renovación, links a la interfaz web de ARCA, y quién es el responsable de hacerlo.

3. **Renovación con tiempo:** Establecer en el calendario del admin una tarea recurrente de revisión anual.

**Responsable:** Admin del sistema / dueño del negocio. No es un proceso automático, requiere intervención humana con la clave privada del titular.

---

### R05 — Expansión del Módulo Contable

**Descripción:**  
"Exportaciones para contador" es el requerimiento más ambiguo del proyecto. Sin una definición precisa, puede convertirse en un módulo interminable que incluye libro diario, balance, integración con Tango, formatos SIAP, etc.

**Escenarios que pueden aparecer tarde:**
- El contador usa software específico (Tango, Bejerman, Contaxi) que tiene su propio formato de importación.
- El negocio necesita presentaciones a ARCA (SIAP, SIFERE) que requieren formatos muy específicos.
- El dueño quiere ver P&L en tiempo real.

**Mitigaciones:**

1. **Reunión obligatoria con el contador ANTES de desarrollar Fase 3.** El contador define exactamente qué archivos necesita, en qué formato, con qué campos.

2. **Scope freeze en Fase 1 y 2.** El módulo contable no existe hasta Fase 3. No agregar "pequeñas funciones contables" en fases anteriores.

3. **Definición escrita del alcance:** Una vez acordado con el contador, documentarlo y no modificarlo sin aprobación explícita del dueño del negocio.

---

### R06 — Calidad de Datos en Migración desde Pascal

**Descripción:**  
Los sistemas viejos suelen tener datos inconsistentes, duplicados, con encodings incorrectos (en Argentina es común encontrar ISO-8859-1 en sistemas Pascal), CUITs inválidos, precios en moneda vieja, etc.

**Escenario de falla:**  
Se migran productos con precios incorrectos. En la primera semana de uso, el cajero factura a un precio viejo sin darse cuenta.

**Mitigaciones:**

1. **Script de validación pre-migración:** Antes de importar, ejecutar un script que reporte: duplicados de código de producto, CUITs inválidos, precios en 0, categorías vacías, encodings no UTF-8.

2. **Migración en staging primero:** Importar todo en el ambiente de staging y revisar manualmente con el dueño del negocio antes de mover a producción.

3. **Importación incremental:** No migrar todo de una vez. Primero productos activos, luego clientes activos, luego historial si es necesario.

4. **Período de verificación paralela:** Dos semanas usando ambos sistemas. Cualquier discrepancia de precio o stock se detecta y corrige antes del corte.

---

### R09 — Concurrencia en D1

**Descripción:**  
D1 es SQLite. SQLite tiene un modelo de escritura serializado (un writer a la vez). Para una tienda con una caja, es irrelevante. Para eventos de alta demanda o si en el futuro se añaden cajas, puede ser un problema.

**Escenario de falla:**  
Dos ventas procesadas simultáneamente intentan escribir en la misma tabla. SQLite serializa, una espera a la otra. Latencia visible de ~50-200ms adicionales.

**Mitigaciones:**

1. **Diseño de v1 para una sola caja:** No hay problema de concurrencia real.

2. **Transacciones explícitas:** Cada venta (descuento de stock + registro de venta + registro de caja) va en una transacción atómica única.

3. **Índices correctos:** Minimiza el tiempo que cada write mantiene el lock.

4. **Si en el futuro hay múltiples cajas:** Evaluar migrar a Durable Objects para serializar el estado de caja, o evaluar otros backends de base de datos.

---

## Riesgos No Técnicos (igualmente importantes)

| ID | Riesgo | Mitigación |
|---|---|---|
| RN01 | El negocio cambia requisitos a mitad del desarrollo | Revisar y re-priorizar al inicio de cada fase, no en medio |
| RN02 | Falta de tiempo del dueño para testing y validación | Definir desde el inicio sesiones semanales de 1 hora para UAT |
| RN03 | Cambio de CUIT/condición fiscal del negocio | Parametrizar los datos del emisor, no hardcodearlos |
| RN04 | Empleado operando el sistema sin capacitación | Manual de usuario simple + video corto de operación básica |

---

## Plan de Contingencia General

Si el sistema nuevo falla completamente en producción (outage total):

1. **Inmediato:** Volver a operar en el sistema Pascal mientras se diagnostica.
2. **No apagar el sistema Pascal** hasta Fase 1 completamente estabilizada (2 meses post-lanzamiento).
3. **Contacto de emergencia:** Tener un número de contacto técnico disponible durante las primeras semanas post-lanzamiento.
4. **Backup de datos:** El export nocturno a R2 permite restaurar datos hasta el día anterior en caso extremo.
