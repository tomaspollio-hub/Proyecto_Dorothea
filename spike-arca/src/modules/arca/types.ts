export type ArcaEnvironment = 'homologacion' | 'produccion';

export interface ArcaConfig {
  cuit: string;
  certPem: string;
  privateKeyPem: string;
  environment: ArcaEnvironment;
  wsaaUrl: string;
  wsfeUrl: string;
}

export interface ArcaToken {
  token: string;
  sign: string;
  expirationTime: Date;
}

export interface CertInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  isExpired: boolean;
  daysUntilExpiry: number;
  serialNumber: string;
}

/**
 * Error con código identificable para facilitar diagnóstico.
 * El mensaje es seguro para loggear (no contiene tokens ni claves).
 */
export class ArcaError extends Error {
  constructor(
    message: string,
    public readonly code: ArcaErrorCode,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'ArcaError';
  }
}

export type ArcaErrorCode =
  | 'CONFIG_MISSING_CUIT'
  | 'CONFIG_MISSING_CERT'
  | 'CONFIG_MISSING_KEY'
  | 'CONFIG_INVALID_ENV'
  | 'CMS_CERT_PARSE_ERROR'
  | 'CMS_KEY_PARSE_ERROR'
  | 'CMS_SIGN_ERROR'
  | 'WSAA_HTTP_ERROR'
  | 'WSAA_SOAP_FAULT'
  | 'WSAA_PARSE_ERROR'
  | 'WSAA_CREDENTIALS_MISSING'
  | 'WSFE_HTTP_ERROR'
  | 'WSFE_SOAP_FAULT'
  | 'WSFE_API_ERROR'
  | 'WSFE_PARSE_ERROR';
