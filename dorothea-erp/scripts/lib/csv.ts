export function decodeCsvBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8')
  if (!utf8.includes('�')) return utf8
  return buffer.toString('latin1')
}

export function parseCsv(content: string): string[][] {
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

export function escapeSql(value: string): string {
  return value.replace(/'/g, "''")
}

export interface RowIssue {
  line: number
  reason: string
}
