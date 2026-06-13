/**
 * CMS (Cryptographic Message Syntax) / PKCS#7 Signing para ARCA.
 *
 * ARCA WSAA requiere que el TRA sea firmado como un mensaje CMS SignedData
 * en formato DER codificado en Base64. Este es el estándar S/MIME "nodetach"
 * (el contenido está incluido dentro del mensaje firmado).
 *
 * Por qué node-forge y no Web Crypto puro:
 *   - Web Crypto API soporta RSA signing (RSASSA-PKCS1-v1_5) pero NO construye
 *     la estructura CMS/PKCS#7 (ASN.1 SignedData). Eso requiere encoding ASN.1
 *     manual o una biblioteca especializada.
 *   - pkijs v3 (alternativa pura Web Crypto) funciona en Workers pero tiene
 *     una API más compleja y mayor riesgo de errores en el empaquetado.
 *   - node-forge: pure JavaScript, maduro, battle-tested con ARCA en múltiples
 *     implementaciones argentinas, funciona con nodejs_compat en Workers.
 *
 * Alternativa documentada: si node-forge tiene problemas de bundling, ver
 *   el comentario al final de este archivo para la implementación con pkijs.
 */
import * as forge from 'node-forge';
import { ArcaError, CertInfo } from './types';

export interface CmsSignResult {
  cmsBase64: string;
  signingTime: Date;
}

/**
 * Firma el TRA XML usando CMS/PKCS#7 SignedData.
 *
 * @param traXml   - El XML del TRA generado por generateTRA()
 * @param certPem  - Certificado PEM (BEGIN CERTIFICATE / BEGIN CERTIFICATE)
 * @param privateKeyPem - Clave privada PEM (PKCS#1 o PKCS#8, ambos aceptados)
 * @returns CMS SignedData en Base64 (lo que WSAA espera como `in0`)
 */
export function signTRACMS(
  traXml: string,
  certPem: string,
  privateKeyPem: string
): CmsSignResult {
  let certificate: forge.pki.Certificate;
  let privateKey: forge.pki.rsa.PrivateKey;

  try {
    certificate = forge.pki.certificateFromPem(certPem);
  } catch (err) {
    throw new ArcaError(
      'No se pudo parsear el certificado PEM. Verificar formato y headers.',
      'CMS_CERT_PARSE_ERROR',
      err instanceof Error ? err.message : String(err)
    );
  }

  try {
    // node-forge acepta PKCS#1 (BEGIN RSA PRIVATE KEY) y
    // PKCS#8 (BEGIN PRIVATE KEY) automáticamente
    privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey;
  } catch (err) {
    throw new ArcaError(
      'No se pudo parsear la clave privada PEM. Verificar formato (PKCS#1 o PKCS#8).',
      'CMS_KEY_PARSE_ERROR',
      err instanceof Error ? err.message : String(err)
    );
  }

  const signingTime = new Date();

  try {
    const p7 = forge.pkcs7.createSignedData();

    // El contenido es el TRA XML en UTF-8
    p7.content = forge.util.createBuffer(traXml, 'utf8');

    // Agregar el certificado al mensaje (ARCA lo requiere incluido)
    p7.addCertificate(certificate);

    p7.addSigner({
      key: privateKey,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        // contentType: indica que el contenido es "data" (OID 1.2.840.113549.1.7.1)
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        // messageDigest: hash SHA-256 del contenido (calculado automáticamente)
        {
          type: forge.pki.oids.messageDigest,
        },
        // signingTime: timestamp de la firma
        {
          type: forge.pki.oids.signingTime,
          value: signingTime,
        },
      ],
    });

    p7.sign();

    // Convertir a DER binario y luego a Base64
    const derBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const cmsBase64 = forge.util.encode64(derBytes);

    return { cmsBase64, signingTime };
  } catch (err) {
    if (err instanceof ArcaError) throw err;
    throw new ArcaError(
      'Error al firmar el TRA con CMS/PKCS7.',
      'CMS_SIGN_ERROR',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Extrae información del certificado para diagnóstico.
 * NUNCA incluir la clave privada ni el token ARCA en logs.
 */
export function getCertInfo(certPem: string): CertInfo {
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const now = Date.now();
    const expiry = cert.validity.notAfter.getTime();
    const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

    const getField = (obj: forge.pki.CertificateField[], field: string): string =>
      obj.find((f) => f.shortName === field || f.name === field)?.value?.toString() ?? 'N/A';

    return {
      subject: getField(cert.subject.attributes, 'CN') || getField(cert.subject.attributes, 'commonName'),
      issuer: getField(cert.issuer.attributes, 'CN') || getField(cert.issuer.attributes, 'commonName'),
      validFrom: cert.validity.notBefore.toISOString(),
      validTo: cert.validity.notAfter.toISOString(),
      isExpired: now > expiry,
      daysUntilExpiry,
      serialNumber: cert.serialNumber,
    };
  } catch {
    return {
      subject: 'ERROR: no se pudo parsear el certificado',
      issuer: 'N/A',
      validFrom: 'N/A',
      validTo: 'N/A',
      isExpired: false,
      daysUntilExpiry: -1,
      serialNumber: 'N/A',
    };
  }
}

/*
 * ─── ALTERNATIVA: pkijs (si node-forge no funciona en tu versión de Wrangler) ───
 *
 * Si `wrangler dev` lanza errores de bundling con node-forge, instalar:
 *   pnpm add pkijs asn1js
 * Y reemplazar signTRACMS con la implementación de pkijs que usa Web Crypto nativo.
 *
 * La ventaja: no requiere nodejs_compat.
 * La desventaja: API más verbosa y mayor superficie de error en el ASN.1 manual.
 *
 * Ver: https://github.com/PeculiarVentures/PKI.js/tree/master/src
 */
