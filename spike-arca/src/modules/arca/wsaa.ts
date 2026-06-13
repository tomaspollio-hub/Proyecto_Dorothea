/**
 * WSAA = Web Service de Autenticación y Autorización (ARCA).
 *
 * Flujo:
 *   1. Generar TRA (Ticket de Requerimiento de Acceso) con generateTRA()
 *   2. Firmar el TRA como CMS con signTRACMS()
 *   3. Enviar a loginCms via SOAP → obtener TA (Ticket de Acceso)
 *   4. El TA contiene token + sign con vigencia de ~12 horas
 *
 * URLs:
 *   Homologación: https://wsaahomo.afip.gov.ar/ws/services/LoginCms
 *   Producción:   https://wsaa.afip.gov.ar/ws/services/LoginCms
 */
import { ArcaConfig, ArcaError, ArcaToken } from './types';
import { decodeXmlEntities, extractSoapFault, extractXmlTag } from './xml-utils';

/**
 * Envía el CMS firmado a WSAA y obtiene el Token de Acceso.
 *
 * @param config    - Configuración ARCA (cuit, urls, etc.)
 * @param cmsBase64 - TRA firmado como CMS Base64 (output de signTRACMS)
 */
export async function loginCms(config: ArcaConfig, cmsBase64: string): Promise<ArcaToken> {
  const soapBody = buildLoginCmsSoap(cmsBase64);

  let responseText: string;

  try {
    const response = await fetch(config.wsaaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        // SOAPAction vacío es requerido por WSAA (SOAP 1.1)
        SOAPAction: '""',
        // User-Agent identificatorio (no enviamos versión real para no exponer info)
        'User-Agent': 'DorothERP/1.0 ARCA-Spike',
      },
      body: soapBody,
      // Workers: fetch() soporta signal con AbortController
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ArcaError(
        `WSAA respondió HTTP ${response.status}. Body: ${body.slice(0, 200)}`,
        'WSAA_HTTP_ERROR'
      );
    }

    responseText = await response.text();
  } catch (err) {
    if (err instanceof ArcaError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    // Timeout, DNS error, connection refused, etc.
    throw new ArcaError(
      `Error de red al conectar con WSAA (${config.wsaaUrl}): ${msg}`,
      'WSAA_HTTP_ERROR'
    );
  }

  return parseLoginCmsResponse(responseText);
}

function buildLoginCmsSoap(cmsBase64: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ser="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:loginCms>
      <ser:in0>${cmsBase64}</ser:in0>
    </ser:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function parseLoginCmsResponse(soapXml: string): ArcaToken {
  // Verificar SOAP Fault primero
  const fault = extractSoapFault(soapXml);
  if (fault) {
    throw new ArcaError(
      `WSAA SOAP Fault [${fault.code}]: ${fault.message}`,
      'WSAA_SOAP_FAULT'
    );
  }

  // Extraer el contenido de <loginCmsReturn> que es XML escapado (XML-inside-XML)
  const returnEncoded = extractXmlTag(soapXml, 'loginCmsReturn');
  if (!returnEncoded) {
    throw new ArcaError(
      'Respuesta WSAA inválida: no se encontró <loginCmsReturn>. ' +
        'Respuesta completa: ' + soapXml.slice(0, 500),
      'WSAA_PARSE_ERROR'
    );
  }

  // Decodificar el XML interno (las entidades &lt; &gt; etc.)
  const loginTicketXml = decodeXmlEntities(returnEncoded);

  const token = extractXmlTag(loginTicketXml, 'token');
  const sign = extractXmlTag(loginTicketXml, 'sign');
  const expirationTimeStr = extractXmlTag(loginTicketXml, 'expirationTime');

  if (!token || !sign) {
    throw new ArcaError(
      'WSAA no devolvió credenciales válidas (token o sign vacíos). ' +
        'Verificar certificado y CUIT registrado en ARCA.',
      'WSAA_CREDENTIALS_MISSING'
    );
  }

  // Parsear fecha de expiración; si falla, usar 12 horas como fallback seguro
  let expirationTime: Date;
  try {
    expirationTime = expirationTimeStr ? new Date(expirationTimeStr) : new Date();
    if (isNaN(expirationTime.getTime())) throw new Error('Invalid date');
  } catch {
    // Fallback: 12 horas desde ahora (los TA de ARCA duran ~12-24 horas)
    expirationTime = new Date(Date.now() + 12 * 60 * 60 * 1000);
  }

  return { token, sign, expirationTime };
}
