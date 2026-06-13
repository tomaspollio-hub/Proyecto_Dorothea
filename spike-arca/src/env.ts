/**
 * Bindings del Worker: variables de entorno y secrets de Cloudflare.
 * Wrangler genera este tipo automáticamente con `wrangler types`,
 * pero lo definimos explícitamente para tener control total.
 */
export interface Env {
  // Secrets (cargados con `wrangler secret put`)
  ARCA_CUIT: string;
  ARCA_CERT: string;
  ARCA_PRIVATE_KEY: string;

  // Variables (definidas en wrangler.toml o .dev.vars)
  ARCA_ENV: string;
  ARCA_WSAA_URL: string;
  ARCA_WSFE_URL: string;
}
