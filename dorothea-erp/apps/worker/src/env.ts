export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  CACHE: KVNamespace
  ARCA_CONFIG: KVNamespace
  STORAGE: R2Bucket
  JWT_SECRET: string
  APP_ENV: 'development' | 'staging' | 'production'
}
