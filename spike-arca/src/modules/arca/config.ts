import type { Env } from '../../env';
import { ArcaConfig, ArcaEnvironment, ArcaError } from './types';

/**
 * Los PEM almacenados como secrets de Cloudflare pueden tener
 * los saltos de línea escapados como \n literal.
 * Esta función los normaliza a saltos de línea reales.
 */
export function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n').trim();
}

/**
 * Construye y valida la configuración ARCA desde las variables de entorno.
 * Lanza ArcaError si falta algún valor crítico.
 */
export function getArcaConfig(env: Env): ArcaConfig {
  if (!env.ARCA_CUIT?.trim()) {
    throw new ArcaError('ARCA_CUIT no configurado', 'CONFIG_MISSING_CUIT');
  }
  if (!env.ARCA_CERT?.trim()) {
    throw new ArcaError('ARCA_CERT no configurado', 'CONFIG_MISSING_CERT');
  }
  if (!env.ARCA_PRIVATE_KEY?.trim()) {
    throw new ArcaError('ARCA_PRIVATE_KEY no configurado', 'CONFIG_MISSING_KEY');
  }

  const environment = env.ARCA_ENV as ArcaEnvironment;
  if (environment !== 'homologacion' && environment !== 'produccion') {
    throw new ArcaError(
      `ARCA_ENV inválido: "${env.ARCA_ENV}". Debe ser "homologacion" o "produccion"`,
      'CONFIG_INVALID_ENV'
    );
  }

  return {
    cuit: env.ARCA_CUIT.trim(),
    certPem: normalizePem(env.ARCA_CERT),
    privateKeyPem: normalizePem(env.ARCA_PRIVATE_KEY),
    environment,
    wsaaUrl: env.ARCA_WSAA_URL,
    wsfeUrl: env.ARCA_WSFE_URL,
  };
}
