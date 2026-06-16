#!/usr/bin/env tsx
// Uso: tsx scripts/import-customers-legacy.ts <archivo.csv>
//
// Importa clientes exportados del sistema Pascal legacy.
// Columnas esperadas en el CSV (sin encabezado fijo, se detecta por nombre):
//   nombre, cuit, telefono, email, direccion
//
// Proceso (según 10_diseno_base_de_datos.md, sección "Estrategia de Migración"):
//   1. Lee el CSV (soporta ISO-8859-1, lo normaliza a UTF-8).
//   2. Valida: CUITs duplicados o con dígito verificador inválido, nombres vacíos.
//   3. Genera un archivo .sql con las filas válidas listo para aplicar con wrangler.
//
// El SQL generado es idempotente: no duplica clientes con el mismo CUIT.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { decodeCsvBuffer, parseCsv, escapeSql, type RowIssue } from './lib/csv.ts'

interface LegacyRow {
  nombre: string
  cuit: string
  telefono: string
  email: string
  direccion: string
}

interface ValidRow {
  name: string
  cuit: string | null
  phone: string | null
  email: string | null
  address: string | null
}

const CUIT_MULTIPLIERS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

function isValidCuit(rawCuit: string): boolean {
  const digits = rawCuit.replace(/\D/g, '')
  if (digits.length !== 11) return false

  const sum = CUIT_MULTIPLIERS.reduce((acc, multiplier, i) => acc + multiplier * Number(digits[i]), 0)
  const mod = sum % 11
  let verifier = 11 - mod
  if (verifier === 11) verifier = 0
  if (verifier === 10) return false

  return verifier === Number(digits[10])
}

function toRecords(rows: string[][]): LegacyRow[] {
  const [header, ...dataRows] = rows
  if (!header) return []

  const normalizedHeader = header.map((h) => h.toLowerCase().trim())
  const columnIndex = {
    nombre: normalizedHeader.findIndex((h) => h.includes('nombre')),
    cuit: normalizedHeader.findIndex((h) => h.includes('cuit')),
    telefono: normalizedHeader.findIndex((h) => h.includes('telefono') || h.includes('teléfono')),
    email: normalizedHeader.findIndex((h) => h.includes('email') || h.includes('correo')),
    direccion: normalizedHeader.findIndex((h) => h.includes('direccion') || h.includes('dirección')),
  }

  if (columnIndex.nombre === -1) {
    throw new Error('El CSV no tiene la columna requerida: nombre')
  }

  return dataRows.map((r) => ({
    nombre: r[columnIndex.nombre] ?? '',
    cuit: columnIndex.cuit >= 0 ? r[columnIndex.cuit] ?? '' : '',
    telefono: columnIndex.telefono >= 0 ? r[columnIndex.telefono] ?? '' : '',
    email: columnIndex.email >= 0 ? r[columnIndex.email] ?? '' : '',
    direccion: columnIndex.direccion >= 0 ? r[columnIndex.direccion] ?? '' : '',
  }))
}

function validateRows(records: LegacyRow[]): { valid: ValidRow[]; issues: RowIssue[] } {
  const valid: ValidRow[] = []
  const issues: RowIssue[] = []
  const seenCuits = new Set<string>()

  records.forEach((record, idx) => {
    const line = idx + 2
    const name = record.nombre.trim()
    const cuit = record.cuit.trim()

    if (!name) {
      issues.push({ line, reason: 'Nombre vacío' })
      return
    }

    if (cuit) {
      if (!isValidCuit(cuit)) {
        issues.push({ line, reason: `CUIT inválido (cliente "${name}"): "${cuit}"` })
        return
      }
      if (seenCuits.has(cuit)) {
        issues.push({ line, reason: `CUIT duplicado en el CSV: ${cuit}` })
        return
      }
      seenCuits.add(cuit)
    }

    valid.push({
      name,
      cuit: cuit || null,
      phone: record.telefono.trim() || null,
      email: record.email.trim() || null,
      address: record.direccion.trim() || null,
    })
  })

  return { valid, issues }
}

function sqlValue(value: string | null): string {
  return value === null ? 'NULL' : `'${escapeSql(value)}'`
}

function generateSql(rows: ValidRow[]): string {
  const statements: string[] = []
  statements.push('-- Generado por scripts/import-customers-legacy.ts')
  statements.push('-- Importación de clientes del sistema Pascal legacy')
  statements.push('')

  for (const row of rows) {
    const existsCheck = row.cuit
      ? `WHERE NOT EXISTS (SELECT 1 FROM customers WHERE cuit = '${escapeSql(row.cuit)}')`
      : `WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name = '${escapeSql(row.name)}' AND cuit IS NULL)`

    statements.push(
      `INSERT INTO customers (id, name, cuit, phone, email, address) ` +
        `SELECT lower(hex(randomblob(16))), '${escapeSql(row.name)}', ${sqlValue(row.cuit)}, ${sqlValue(row.phone)}, ${sqlValue(row.email)}, ${sqlValue(row.address)} ` +
        existsCheck +
        ';',
    )
  }

  return statements.join('\n') + '\n'
}

function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Uso: tsx scripts/import-customers-legacy.ts <archivo.csv>')
    process.exit(1)
  }

  const buffer = readFileSync(inputPath)
  const content = decodeCsvBuffer(buffer)
  const rows = parseCsv(content)
  const records = toRecords(rows)
  const { valid, issues } = validateRows(records)

  console.log(`Filas leídas: ${records.length}`)
  console.log(`Filas válidas: ${valid.length}`)
  console.log(`Filas con problemas: ${issues.length}`)

  if (issues.length > 0) {
    console.log('\nProblemas encontrados:')
    for (const issue of issues) {
      console.log(`  Línea ${issue.line}: ${issue.reason}`)
    }
  }

  if (valid.length === 0) {
    console.log('\nNo hay filas válidas para importar.')
    return
  }

  const sql = generateSql(valid)
  const outputName = basename(inputPath, '.csv') + '.import.sql'
  const outputPath = join('scripts', 'output', outputName)

  writeFileSync(outputPath, sql)

  console.log(`\nSQL generado en: ${outputPath}`)
  console.log('\nPara aplicar en la base local (ejecutar desde apps/worker):')
  console.log(`  wrangler d1 execute dorothea-db --local --file=../../${outputPath}`)
  console.log('\nPara aplicar en la base remota (producción, ejecutar desde apps/worker):')
  console.log(`  wrangler d1 execute dorothea-db --remote --file=../../${outputPath}`)
}

main()
