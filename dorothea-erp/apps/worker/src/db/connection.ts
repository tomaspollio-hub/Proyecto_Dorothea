import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@dorothea/db/schema'
import type { Env } from '../env.ts'

export function getDb(env: Env) {
  return drizzle(env.DB, { schema })
}

export type DbClient = ReturnType<typeof getDb>
