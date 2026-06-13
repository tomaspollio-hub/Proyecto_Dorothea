/**
 * Utilidades de parseo XML/SOAP para respuestas de ARCA.
 *
 * No usamos un parser XML completo intencionalmente:
 *  - DOMParser está disponible en Workers pero agrega fragilidad por namespace handling.
 *  - Las respuestas SOAP de ARCA son estructuralmente predecibles y bien documentadas.
 *  - Regex sobre XML bien-formado y conocido es más simple y tiene menos dependencias.
 *
 * Si en el futuro se necesita parsear respuestas más complejas (ej: FECAESolicitar),
 * considerar `fast-xml-parser` que es compatible con Workers.
 */

/**
 * Extrae el contenido de una etiqueta XML (primera ocurrencia).
 * Maneja etiquetas con o sin namespaces: <Token> y <ns1:Token> ambas funcionan.
 */
export function extractXmlTag(xml: string, tagName: string): string | null {
  // Busca <tagName> o <ns:tagName> (con namespace arbitrario)
  const pattern = new RegExp(`<(?:[^:>]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tagName}>`, 'i');
  const match = xml.match(pattern);
  return match?.[1]?.trim() ?? null;
}

/**
 * Decodifica entidades XML básicas.
 * Necesario porque WSAA devuelve el loginTicketResponse como XML-dentro-de-XML
 * (el contenido de <loginCmsReturn> está escapado con &lt; &gt; etc.)
 */
export function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Extrae el SOAP Fault si existe en la respuesta.
 * Retorna null si no hay fault.
 */
export function extractSoapFault(soapXml: string): { code: string; message: string } | null {
  const faultString = extractXmlTag(soapXml, 'faultstring');
  if (!faultString) return null;

  const faultCode = extractXmlTag(soapXml, 'faultcode') ?? 'UNKNOWN';
  return { code: faultCode, message: faultString };
}

/**
 * Extrae errores de WSFEv1 (estructura <Errors><Err><Code>/<Msg>).
 */
export function extractWsfeErrors(soapXml: string): Array<{ code: string; message: string }> {
  const errors: Array<{ code: string; message: string }> = [];

  // Extraer todos los bloques <Err>...</Err>
  const errPattern = /<(?:[^:>]+:)?Err[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?Err>/gi;
  let match: RegExpExecArray | null;

  while ((match = errPattern.exec(soapXml)) !== null) {
    const errBlock = match[1] ?? '';
    const code = extractXmlTag(errBlock, 'Code') ?? extractXmlTag(errBlock, 'code') ?? 'N/A';
    const msg = extractXmlTag(errBlock, 'Msg') ?? extractXmlTag(errBlock, 'msg') ?? 'Error desconocido';
    errors.push({ code, message: msg });
  }

  return errors;
}
