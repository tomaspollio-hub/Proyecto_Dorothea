#!/usr/bin/env tsx
// Uso: pnpm seed:local
// Crea el usuario admin inicial en la base de datos local D1

import { createInitialAdmin } from '../apps/worker/src/services/auth.service.ts'
import { getDb } from '../apps/worker/src/db/connection.ts'
import { defaultAdmin } from '../packages/db/seed/default-user.ts'

async function main() {
  console.log('Creando usuario admin inicial...')

  // En un entorno real con D1 local, esto requiere `wrangler d1 execute`
  // Este script es una referencia — ver README para el comando correcto
  console.log(`
Para crear el usuario admin inicial, ejecutar:

  wrangler d1 execute dorothea-db --local --command="
    INSERT INTO users (email, password_hash, name, role)
    VALUES ('${defaultAdmin.email}', '<hash>', '${defaultAdmin.name}', '${defaultAdmin.role}');
  "

O usar el endpoint de seeding (solo en development):
  curl -X POST http://localhost:8787/api/v1/auth/seed \\
    -H "Content-Type: application/json" \\
    -d '{"email":"${defaultAdmin.email}","password":"${defaultAdmin.passwordPlain}","name":"${defaultAdmin.name}"}'
`)
}

main().catch(console.error)
