/**
 * WSFEv1 = Web Service de Facturación Electrónica versión 1 (ARCA).
 *
 * Este archivo implementa solo FECompUltimoAutorizado para el spike.
 * En el ERP completo, aquí irá también FECAESolicitar, FECompConsultar, etc.
 *
 * URLs:
 *   Homologación: https://wswhomo.afip.gov.ar/wsfev1/service.asmx
 *   Producción:   https://servicios1.afip.gov.ar/wsfev1/service.asmx
 *
 * Namespace SOAP: http://ar.gov.afip.dif.FEV1/
 */
import { ArcaConfig, ArcaError, ArcaToken } from './types';
import { extractSoapFault, extractWsfeErrors, extractXmlTag } from './xml-utils';

export interface UltimoComprobanteResult {
  ptoVta: number;
  cbteTipo: number;
  nroComprobante: number;
}

/**
 * FECompUltimoAutorizado: consulta el último número de comprobante
 * autorizado para un punto de venta y tipo de comprobante dado.
 *
 * Útil para:
 *  - Verificar la conectividad con WSFEv1
 *  - Saber qué número de comprobante emitir a continuación
 *  - Detectar inconsistencias entre sistema y ARCA
 *
 * @param config    - Configuración ARCA
 * @param token     - TA obtenido de loginCms()
 * @param ptoVta    - Número de punto de venta (ej: 1)
 * @param cbteTipo  - Tipo de comprobante: 6=FacturaB, 11=FacturaC, 1=FacturaA
 */
export async function getUltimoComprobante(
  config: ArcaConfig,
  token: ArcaToken,
  ptoVta: number = 1,
  cbteTipo: number = 6
): Promise<UltimoComprobanteResult> {
  const soapBody = buildUltimoComprobanteSoap(config.cuit, token, ptoVta, cbteTipo);

  let responseText: string;

  try {
    const response = await fetch(config.wsfeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        SOAPAction: '"http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado"',
        'User-Agent': 'DorothERP/1.0 ARCA-Spike',
      },
      body: soapBody,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ArcaError(
        `WSFEv1 respondió HTTP ${response.status}. Body: ${body.slice(0, 200)}`,
        'WSFE_HTTP_ERROR'
      );
    }

    responseText = await response.text();
  } catch (err) {
    if (err instanceof ArcaError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ArcaError(
      `Error de red al conectar con WSFEv1 (${config.wsfeUrl}): ${msg}`,
      'WSFE_HTTP_ERROR'
    );
  }

  return parseUltimoComprobanteResponse(responseText, ptoVta, cbteTipo);
}

function buildUltimoComprobanteSoap(
  cuit: string,
  token: ArcaToken,
  ptoVta: number,
  cbteTipo: number
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${token.token}</ar:Token>
        <ar:Sign>${token.sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${ptoVta}</ar:PtoVta>
      <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function parseUltimoComprobanteResponse(
  soapXml: string,
  ptoVta: number,
  cbteTipo: number
): UltimoComprobanteResult {
  const fault = extractSoapFault(soapXml);
  if (fault) {
    throw new ArcaError(
      `WSFEv1 SOAP Fault [${fault.code}]: ${fault.message}`,
      'WSFE_SOAP_FAULT'
    );
  }

  const wsfeErrors = extractWsfeErrors(soapXml);
  if (wsfeErrors.length > 0) {
    const errSummary = wsfeErrors.map((e) => `[${e.code}] ${e.message}`).join('; ');
    throw new ArcaError(
      `WSFEv1 retornó errores: ${errSummary}`,
      'WSFE_API_ERROR'
    );
  }

  const cbteNroStr = extractXmlTag(soapXml, 'CbteNro');
  if (cbteNroStr === null) {
    throw new ArcaError(
      'Respuesta WSFEv1 inválida: no se encontró <CbteNro>. ' +
        'Respuesta: ' + soapXml.slice(0, 500),
      'WSFE_PARSE_ERROR'
    );
  }

  const nroComprobante = parseInt(cbteNroStr, 10);

  // ARCA devuelve -1 cuando nunca se emitió un comprobante para ese PV/tipo
  // No es un error: significa que el próximo comprobante será el número 1.
  if (isNaN(nroComprobante)) {
    throw new ArcaError(
      `WSFEv1 devolvió CbteNro no numérico: "${cbteNroStr}"`,
      'WSFE_PARSE_ERROR'
    );
  }

  return { ptoVta, cbteTipo, nroComprobante };
}

/**
 * Tipos de comprobante más comunes (referencia rápida para el spike).
 * En el ERP completo, esto será un enum con todos los tipos ARCA.
 */
export const CBTE_TIPOS = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  NOTA_DEBITO_A: 2,
  NOTA_DEBITO_B: 7,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_A: 3,
  NOTA_CREDITO_B: 8,
  NOTA_CREDITO_C: 13,
} as const;
