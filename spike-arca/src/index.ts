/**
 * Entry point del Worker — Dorothea ARCA Spike
 *
 * Worker mínimo con Hono para validar la integración ARCA
 * antes de construir el ERP completo.
 */
import { Hono } from 'hono';
import type { Env } from './env';
import { arcaRouter } from './routes/arca';

const app = new Hono<{ Bindings: Env }>();

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/', (c) =>
  c.json({
    service: 'Dorothea ARCA Spike',
    version: '0.1.0',
    endpoints: [
      'GET  /api/arca/status',
      'POST /api/arca/wsaa/login',
      'GET  /api/arca/wsfe/ultimo-comprobante?pto_vta=1&cbte_tipo=6',
    ],
  })
);

// ─── Rutas ARCA ────────────────────────────────────────────────────────────
app.route('/api/arca', arcaRouter);

// ─── 404 catch-all ─────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ error: 'Endpoint no encontrado', path: c.req.path }, 404)
);

// ─── Error handler global ──────────────────────────────────────────────────
app.onError((err, c) => {
  // No loggear el error completo ya que puede contener info de contexto sensible
  const message = err instanceof Error ? err.message : 'Error interno desconocido';
  console.error('[Worker] Error no manejado:', message);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

export default app;
