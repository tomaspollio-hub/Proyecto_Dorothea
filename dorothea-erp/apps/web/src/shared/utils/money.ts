export function centsToArs(cents: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100)
}

export function arsToCents(ars: number): number {
  return Math.round(ars * 100)
}
