# Dorothea Pet Shop ERP — Documentación de Arquitectura

**Fecha de inicio:** 2026-06-05  
**Stack:** React + Cloudflare Workers + D1 + R2 + Hono.js  
**Facturación:** ARCA (ex-AFIP) WSFEv1

---

## Documentos de Arquitectura

| # | Documento | Descripción |
|---|---|---|
| 00 | [Análisis Crítico y Recomendaciones](./00_analisis_critico_y_recomendaciones.md) | Evaluación honesta del alcance, riesgos principales, y decisiones de simplificación |
| 01 | [Arquitectura General](./01_arquitectura_general.md) | Stack técnico completo, capas del sistema, flujos principales, seguridad |
| 02 | [Mapa de Módulos](./02_mapa_de_modulos.md) | Descripción detallada de los 12 módulos del sistema |
| 03 | [Dependencias entre Módulos](./03_dependencias_entre_modulos.md) | Diagrama de dependencias, contratos de interfaz, orden de desarrollo |
| 04 | [Roadmap de Desarrollo](./04_roadmap_de_desarrollo.md) | Plan por fases: Fase 0 (2s) + Fase 1 MVP (10s) + Fase 2 (8s) + Fase 3 (6s) |
| 05 | [Riesgos Técnicos](./05_riesgos_tecnicos.md) | Matriz de riesgos, análisis de riesgos críticos (ARCA, D1, migración) |
| 06 | [Estructura de Carpetas](./06_estructura_de_carpetas.md) | Árbol completo del monorepo (web + worker + packages) |
| 07 | [Convenciones de Código](./07_convenciones_de_codigo.md) | TypeScript, nomenclatura, manejo de errores, dinero en centavos, Git |
| 08 | [Estrategia de Testing](./08_estrategia_de_testing.md) | Pirámide de tests, Vitest + Miniflare + Playwright, testing de ARCA |
| 09 | [Estrategia de Despliegue](./09_estrategia_de_despliegue.md) | CI/CD, ambientes, migraciones, rollback, costos (~$5 USD/mes) |
| 10 | [Diseño de Base de Datos](./10_diseno_base_de_datos.md) | Esquema completo D1/SQLite, ERD, índices, migración desde Pascal |

---

## Decisiones Clave de Arquitectura

1. **Todo en Cloudflare.** Pages + Workers + D1 + R2 + KV + Queues. Sin servidores propios.
2. **ARCA asíncrono.** La facturación nunca bloquea la venta. Usa Cloudflare Queues.
3. **Dinero en centavos.** Todos los montos son INTEGER en la DB. Sin floats.
4. **Snapshots en ventas.** Los ítems de venta guardan precio y descripción al momento de la venta.
5. **Faseado.** 7 módulos en Fase 1 (MVP operativo), el resto en Fases 2 y 3.
6. **Paralelo con Pascal.** El sistema viejo no se apaga hasta 2 meses post-lanzamiento estable.

---

## Próximo Paso

Iniciar **Fase 0** del roadmap: setup de infraestructura Cloudflare y scaffolding del repositorio.

Ver: [Roadmap detallado](./04_roadmap_de_desarrollo.md)
# Proyecto_Dorothea
