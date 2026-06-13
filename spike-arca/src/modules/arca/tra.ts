/**
 * TRA = Ticket de Requerimiento de Acceso.
 * Es el XML que se firma y se envía a WSAA para obtener un Token de Acceso (TA).
 *
 * Según la especificación WSAA de ARCA:
 *   - generationTime: ahora menos 5 minutos (tolerancia de retraso de red)
 *   - expirationTime: ahora más 10 minutos (ventana de validez del TRA)
 *   - uniqueId: timestamp Unix (debe ser único por request)
 *   - service: el servicio ARCA que se quiere acceder (ej: "wsfe")
 */
export function generateTRA(service: string = 'wsfe'): string {
  const now = new Date();

  const generationTime = new Date(now.getTime() - 5 * 60 * 1000);
  const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);
  const uniqueId = Math.floor(now.getTime() / 1000);

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${formatArcaDate(generationTime)}</generationTime>
    <expirationTime>${formatArcaDate(expirationTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

/**
 * ARCA espera fechas en formato ISO 8601 con timezone explícito.
 * Usa -03:00 (Argentina Standard Time, sin horario de verano desde 2000).
 *
 * Nota: Argentina NO usa Daylight Saving Time desde el año 2000.
 * El offset es siempre -03:00.
 */
function formatArcaDate(date: Date): string {
  const argentinaOffset = -3 * 60;
  const utcMs = date.getTime();
  const argMs = utcMs + argentinaOffset * 60 * 1000;
  const argDate = new Date(argMs);

  const pad = (n: number): string => n.toString().padStart(2, '0');
  const ms = argDate.getUTCMilliseconds().toString().padStart(3, '0');

  return (
    `${argDate.getUTCFullYear()}-` +
    `${pad(argDate.getUTCMonth() + 1)}-` +
    `${pad(argDate.getUTCDate())}T` +
    `${pad(argDate.getUTCHours())}:` +
    `${pad(argDate.getUTCMinutes())}:` +
    `${pad(argDate.getUTCSeconds())}.${ms}` +
    `-03:00`
  );
}
