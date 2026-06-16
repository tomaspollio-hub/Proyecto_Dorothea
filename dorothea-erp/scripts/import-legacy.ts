#!/usr/bin/env tsx
// Uso: tsx scripts/import-legacy.ts <archivo.csv>
//
// Importa productos exportados del sistema Pascal legacy.
// Columnas esperadas en el CSV (sin encabezado fijo, se detecta por nombre):
//   codigo, nombre, precio, categoria, stock
//
// Proceso (según 10_diseno_base_de_datos.md, sección "Estrategia de Migración"):
//   1. Lee el CSV (soporta ISO-8859-1, lo normaliza a UTF-8).
//   2. Valida: códigos duplicados, precios <= 0, categoría vacía, filas incompletas.
//   3. Genera un archivo .sql con las filas válidas listo para aplicar con wrangler.
//
// El SQL generado es idempotente: no duplica categorías ni productos existentes.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'

interface LegacyRow {
  codigo: string
  nombre: string
  precio: string
  categoria: string
  stock: string
}

interface ValidRow {
  code: string
  name: string
  priceCents: number
  category: string
  stock: number
}

interface RowIssue {
  line: number
  reason: string
}

function decodeCsvBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8')
  if (!utf8.includes('�')) return utf8
  return buffer.toString('latin1')
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',' || char === ';') {
      row.push(field.trim())
      field = ''
    } else if (char === '\n') {
      row.push(field.trim())
      rows.push(row)
      row = []
      field = ''
    } else if (char === '\r') {
      // ignorar, lo maneja \n
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim())
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.length > 0))
}

function toRecords(rows: string[][]): LegacyRow[] {
  const [header, ...dataRows] = rows
  if (!header) return []

  const normalizedHeader = header.map((h) => h.toLowerCase().trim())
  const columnIndex = {
    codigo: normalizedHeader.findIndex((h) => h.includes('codigo') || h.includes('código')),
    nombre: normalizedHeader.findIndex((h) => h.includes('nombre')),
    precio: normalizedHeader.findIndex((h) => h.includes('precio')),
    categoria: normalizedHeader.findIndex((h) => h.includes('categoria') || h.includes('categoría')),
    stock: normalizedHeader.findIndex((h) => h.includes('stock')),
  }

  const missing = Object.entries(columnIndex)
    .filter(([, idx]) => idx === -1)
    .map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(`El CSV no tiene las columnas requeridas: ${missing.join(', ')}`)
  }

  return dataRows.map((r) => ({
    codigo: r[columnIndex.codigo] ?? '',
    nombre: r[columnIndex.nombre] ?? '',
    precio: r[columnIndex.precio] ?? '',
    categoria: r[columnIndex.categoria] ?? '',
    stock: r[columnIndex.stock] ?? '',
  }))
}

function parsePriceToCents(raw: string): number | null {
  const normalized = raw.replace(/\./g, '').replace(',', '.').trim()
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

function validateRows(records: LegacyRow[]): { valid: ValidRow[]; issues: RowIssue[] } {
  const valid: ValidRow[] = []
  const issues: RowIssue[] = []
  const seenCodes = new Set<string>()

  records.forEach((record, idx) => {
    const line = idx + 2 // +1 por header, +1 porque idx es 0-based
    const code = record.codigo.trim()
    const name = record.nombre.trim()
    const category = record.categoria.trim()
    const stock = Number(record.stock.trim())

    if (!code) {
      issues.push({ line, reason: 'Código vacío' })
      return
    }
    if (seenCodes.has(code)) {
      issues.push({ line, reason: `Código duplicado en el CSV: ${code}` })
      return
    }
    if (!name) {
      issues.push({ line, reason: `Nombre vacío (código ${code})` })
      return
    }
    if (!category) {
      issues.push({ line, reason: `Categoría vacía (código ${code})` })
      return
    }

    const priceCents = parsePriceToCents(record.precio)
    if (priceCents === null || priceCents <= 0) {
      issues.push({ line, reason: `Precio inválido o <= 0 (código ${code}): "${record.precio}"` })
      return
    }

    if (!Number.isFinite(stock) || stock < 0) {
      issues.push({ line, reason: `Stock inválido (código ${code}): "${record.stock}"` })
      return
    }

    seenCodes.add(code)
    valid.push({ code, name, priceCents, category, stock })
  })

  return { valid, issues }
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''")
}

function generateSql(rows: ValidRow[]): string {
  const categories = [...new Set(rows.map((r) => r.category))]

  const statements: string[] = []
  statements.push('-- Generado por scripts/import-legacy.ts')
  statements.push('-- Importación de productos del sistema Pascal legacy')
  statements.push('')

  statements.push('-- Categorías nuevas (no duplica si ya existen)')
  for (const category of categories) {
    statements.push(
      `INSERT INTO categories (id, name) SELECT lower(hex(randomblob(16))), '${escapeSql(category)}' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '${escapeSql(category)}');`,
    )
  }
  statements.push('')

  statements.push('-- Productos (no duplica si el código ya existe)')
  for (const row of rows) {
    statements.push(
      `INSERT INTO products (id, code, name, price_cents, category_id, unit, min_stock) ` +
        `SELECT lower(hex(randomblob(16))), '${escapeSql(row.code)}', '${escapeSql(row.name)}', ${row.priceCents}, ` +
        `(SELECT id FROM categories WHERE name = '${escapeSql(row.category)}'), 'unidad', 0 ` +
        `WHERE NOT EXISTS (SELECT 1 FROM products WHERE code = '${escapeSql(row.code)}');`,
    )
  }
  statements.push('')

  statements.push('-- Stock inicial (no duplica si ya existe el registro de inventario)')
  for (const row of rows) {
    statements.push(
      `INSERT INTO inventory (id, product_id, quantity) ` +
        `SELECT lower(hex(randomblob(16))), id, ${row.stock} FROM products ` +
        `WHERE code = '${escapeSql(row.code)}' ` +
        `AND NOT EXISTS (SELECT 1 FROM inventory WHERE product_id = products.id);`,
    )
  }

  return statements.join('\n') + '\n'
}

function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Uso: tsx scripts/import-legacy.ts <archivo.csv>')
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
