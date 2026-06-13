/**
 * Rutas del spike ARCA. Tres endpoints de validación:
 *
 *   GET  /api/arca/status               → Verifica configuración y estado del certificado
 *   POST /api/arca/wsaa/login           → Autentica contra WSAA y valida el flujo de firma
 *   GET  /api/arca/wsfe/ultimo-comprobante → Consulta el último CBT emitido (requiere WSAA)
 *
 * IMPORTANTE - Seguridad de logs:
 *   - NUNCA loggear token, sign, private key, ni el CMS Base64.
 *   - Solo se loggea información no sensible: duración, éxito/fallo, código de error.
 *   - Los responses exponen presencia (boolean) pero no el contenido de credenciales.
 */
import { Hono } from 'hono';
import type { Env } from '../env';
import {
  ArcaErrorClass,
  CBTE_TIPOS,
  generateTRA,
  getArcaConfig,
  getCertInfo,
  getUltimoComprobante,
  loginCms,
  signTRACMS,
} from '../modules/arca/index';

export const arcaRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/arca/status
 *
 * Verifica que la configuración está completa y que el certificado
 * está cargado y es válido (sin hacer ninguna llamada a ARCA).
 * Útil para diagnosticar problemas de setup antes de intentar conectar.
 */
arcaRouter.get('/status', (c) => {
  try {
    const config = getArcaConfig(c.env);
    const certInfo = getCertInfo(config.certPem);

    return c.json({
      ok: true,
      config: {
        environment: config.environment,
        cuit: config.cuit,
        wsaaUrl: config.wsaaUrl,
        wsfeUrl: config.wsfeUrl,
      },
      certificate: certInfo,
      warnings: buildWarnings(certInfo),
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof ArcaErrorClass ? err.message : 'Error de configuración',
        code: err instanceof ArcaErrorClass ? err.code : 'UNKNOWN',
      },
      500
    );
  }
});

/**
 * POST /api/arca/wsaa/login
 *
 * Ejecuta el flujo completo de autenticación WSAA:
 *   1. Genera TRA
 *   2. Firma con CMS/PKCS7
 *   3. Llama a WSAA loginCms
 *   4. Retorna metadata del token (NO el token ni el sign)
 *
 * Si este endpoint responde con ok:true, la integración ARCA está funcionando.
 */
arcaRouter.post('/wsaa/login', async (c) => {
  const startTime = Date.now();

  try {
    const config = getArcaConfig(c.env);

    // Paso 1: Generar TRA
    const tra = generateTRA('wsfe');
    console.log('[ARCA] TRA generado para servicio wsfe');

    // Paso 2: Firmar con CMS (operación CPU-intensiva, ~5-20ms)
    const cmsStart = Date.now();
    const { cmsBase64, signingTime } = signTRACMS(
      tra,
      config.certPem,
      config.privateKeyPem
    );
    console.log(`[ARCA] CMS firmado en ${Date.now() - cmsStart}ms`);

    // Paso 3: Enviar a WSAA
    const wsaaStart = Date.now();
    const token = await loginCms(config, cmsBase64);
    const wsaaMs = Date.now() - wsaaStart;
    console.log(`[ARCA] WSAA respondió en ${wsaaMs}ms`);

    const totalMs = Date.now() - startTime;

    return c.json({
      ok: true,
      message: 'Autenticación WSAA exitosa',
      timing: {
        totalMs,
        wsaaMs,
      },
      token: {
        // NO incluir token.token ni token.sign
        expirationTime: token.expirationTime.toISOString(),
        tokenLength: token.token.length,
        signLength: token.sign.length,
        isPresent: token.token.length > 0 && token.sign.length > 0,
      },
      tra: {
        signingTime: signingTime.toISOString(),
        service: 'wsfe',
      },
      environment: config.environment,
    });
  } catch (err) {
    const totalMs = Date.now() - startTime;

    if (err instanceof ArcaErrorClass) {
      console.error(`[ARCA] Error en WSAA login [${err.code}]: ${err.message}`, {
        code: err.code,
        detail: err.detail,
        totalMs,
      });

      return c.json(
        {
          ok: false,
          error: err.message,
          code: err.code,
          detail: err.detail,
          timing: { totalMs },
          diagnostico: getDiagnostico(err.code),
        },
        502
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ARCA] Error inesperado en WSAA login: ${msg}`);

    return c.json({ ok: false, error: 'Error interno', timing: { totalMs } }, 500);
  }
});

/**
 * GET /api/arca/wsfe/ultimo-comprobante?pto_vta=1&cbte_tipo=6
 *
 * Flujo completo: WSAA login → WSFEv1 FECompUltimoAutorizado.
 * Si este endpoint responde con ok:true, el sistema puede emitir facturas.
 *
 * Query params:
 *   pto_vta  (default: 1) — Número de punto de venta
 *   cbte_tipo (default: 6) — Tipo: 6=FactB, 11=FactC, 1=FactA
 */
arcaRouter.get('/wsfe/ultimo-comprobante', async (c) => {
  const startTime = Date.now();

  const ptoVta = parseInt(c.req.query('pto_vta') ?? '1', 10);
  const cbteTipo = parseInt(c.req.query('cbte_tipo') ?? '6', 10);

  if (isNaN(ptoVta) || ptoVta < 1) {
    return c.json({ ok: false, error: 'pto_vta inválido (debe ser entero >= 1)' }, 400);
  }
  if (!Object.values(CBTE_TIPOS).includes(cbteTipo as (typeof CBTE_TIPOS)[keyof typeof CBTE_TIPOS])) {
    return c.json(
      {
        ok: false,
        error: `cbte_tipo ${cbteTipo} no reconocido`,
        tiposValidos: CBTE_TIPOS,
      },
      400
    );
  }

  try {
    const config = getArcaConfig(c.env);

    // Paso 1 y 2: autenticación WSAA
    const tra = generateTRA('wsfe');
    const { cmsBase64 } = signTRACMS(tra, config.certPem, config.privateKeyPem);
    const token = await loginCms(config, cmsBase64);
    console.log('[ARCA] WSAA login OK, consultando WSFEv1...');

    // Paso 3: consulta WSFEv1
    const wsfeStart = Date.now();
    const result = await getUltimoComprobante(config, token, ptoVta, cbteTipo);
    const wsfeMs = Date.now() - wsfeStart;

    const totalMs = Date.now() - startTime;
    console.log(`[ARCA] WSFEv1 respondió en ${wsfeMs}ms`);

    const cbteNombreMap: Record<number, string> = {
      1: 'Factura A',
      6: 'Factura B',
      11: 'Factura C',
      2: 'Nota de Débito A',
      7: 'Nota de Débito B',
      12: 'Nota de Débito C',
      3: 'Nota de Crédito A',
      8: 'Nota de Crédito B',
      13: 'Nota de Crédito C',
    };

    return c.json({
      ok: true,
      resultado: {
        ptoVta: result.ptoVta,
        cbteTipo: result.cbteTipo,
        cbteTipoNombre: cbteNombreMap[result.cbteTipo] ?? `Tipo ${result.cbteTipo}`,
        nroComprobante: result.nroComprobante,
        proximoComprobante: result.nroComprobante === -1 ? 1 : result.nroComprobante + 1,
        mensaje:
          result.nroComprobante === -1
            ? 'No hay comprobantes emitidos. El próximo será el número 1.'
            : `Último comprobante: ${result.nroComprobante}. El próximo será el ${result.nroComprobante + 1}.`,
      },
      timing: { totalMs, wsfeMs },
      environment: config.environment,
    });
  } catch (err) {
    const totalMs = Date.now() - startTime;

    if (err instanceof ArcaErrorClass) {
      console.error(`[ARCA] Error [${err.code}]: ${err.message}`);

      return c.json(
        {
          ok: false,
          error: err.message,
          code: err.code,
          detail: err.detail,
          timing: { totalMs },
          diagnostico: getDiagnostico(err.code),
        },
        502
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ARCA] Error inesperado: ${msg}`);

    return c.json({ ok: false, error: 'Error interno', timing: { totalMs } }, 500);
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildWarnings(certInfo: ReturnType<typeof getCertInfo>): string[] {
  const warnings: string[] = [];
  if (certInfo.isExpired) {
    warnings.push('CRÍTICO: El certificado está vencido. La facturación está bloqueada.');
  } else if (certInfo.daysUntilExpiry < 30) {
    warnings.push(`ATENCIÓN: El certificado vence en ${certInfo.daysUntilExpiry} días. Renovar pronto.`);
  }
  return warnings;
}

function getDiagnostico(code: string): string {
  const diagnosticos: Record<string, string> = {
    CONFIG_MISSING_CUIT: 'Cargar ARCA_CUIT con: wrangler secret put ARCA_CUIT',
    CONFIG_MISSING_CERT: 'Cargar certificado con: cat cert.pem | wrangler secret put ARCA_CERT',
    CONFIG_MISSING_KEY: 'Cargar clave privada con: cat private.key | wrangler secret put ARCA_PRIVATE_KEY',
    CONFIG_INVALID_ENV: 'ARCA_ENV debe ser "homologacion" o "produccion"',
    CMS_CERT_PARSE_ERROR: 'El certificado PEM tiene formato inválido. Verificar que incluya los headers BEGIN/END CERTIFICATE y que los saltos de línea sean correctos.',
    CMS_KEY_PARSE_ERROR: 'La clave privada PEM tiene formato inválido. Soportados: PKCS#1 (BEGIN RSA PRIVATE KEY) y PKCS#8 (BEGIN PRIVATE KEY).',
    CMS_SIGN_ERROR: 'Error al firmar. Verificar que la clave privada corresponde al certificado.',
    WSAA_HTTP_ERROR: 'ARCA WSAA no responde. Verificar conectividad y que la URL sea correcta. ARCA puede estar en mantenimiento.',
    WSAA_SOAP_FAULT: 'WSAA rechazó el mensaje. Causas frecuentes: certificado no registrado en ARCA, TRA expirado, formato de firma incorrecto.',
    WSAA_PARSE_ERROR: 'Respuesta WSAA inesperada. Ver campo "detail" para el body completo.',
    WSAA_CREDENTIALS_MISSING: 'WSAA no devolvió token/sign. Verificar que el CUIT esté habilitado para el servicio wsfe en ARCA.',
    WSFE_HTTP_ERROR: 'WSFEv1 no responde. Verificar URL y conectividad.',
    WSFE_SOAP_FAULT: 'WSFEv1 rechazó el request SOAP. Ver campo "detail".',
    WSFE_API_ERROR: 'WSFEv1 devolvió errores de negocio. Ver campo "detail" para códigos de error ARCA.',
    WSFE_PARSE_ERROR: 'Respuesta WSFEv1 con formato inesperado. Ver campo "detail".',
  };

  return diagnosticos[code] ?? 'Ver documentación ARCA: https://www.afip.gob.ar/ws/documentacion/';
}
