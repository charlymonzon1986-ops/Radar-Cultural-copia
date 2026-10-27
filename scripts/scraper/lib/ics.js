/**
 * Parser mínimo de iCalendar (ICS). Sin dependencias.
 * Las fechas UTC (sufijo Z) se convierten a hora de Argentina (UTC-3).
 */

const pad = (n) => String(n).padStart(2, '0');

/** "20261024T200000Z" | "20261024T200000" | "20261024" -> { fecha: 'YYYY-MM-DD', hora: 'HH:MM' | null } */
export function icsFecha(valor) {
  if (!valor) return { fecha: null, hora: null };
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(?:\d{2})?(Z)?)?/.exec(String(valor).trim());
  if (!m) return { fecha: null, hora: null };
  if (!m[4]) return { fecha: `${m[1]}-${m[2]}-${m[3]}`, hora: null };

  if (m[6] === 'Z') {
    const utc = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    const ar = new Date(utc.getTime() - 3 * 3600 * 1000);
    return {
      fecha: `${ar.getUTCFullYear()}-${pad(ar.getUTCMonth() + 1)}-${pad(ar.getUTCDate())}`,
      hora: `${pad(ar.getUTCHours())}:${pad(ar.getUTCMinutes())}`
    };
  }
  return { fecha: `${m[1]}-${m[2]}-${m[3]}`, hora: `${m[4]}:${m[5]}` };
}

export function parseICS(texto) {
  const lineas = String(texto).replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  const eventos = [];
  let actual = null;

  for (const linea of lineas) {
    if (linea === 'BEGIN:VEVENT') { actual = {}; continue; }
    if (linea === 'END:VEVENT') { if (actual) eventos.push(actual); actual = null; continue; }
    if (!actual) continue;

    const idx = linea.indexOf(':');
    if (idx < 0) continue;
    const clave = linea.slice(0, idx).split(';')[0].toUpperCase();
    actual[clave] = linea.slice(idx + 1)
      .replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ').trim();
  }

  return eventos.map((e) => {
    const inicio = icsFecha(e.DTSTART);
    const fin = icsFecha(e.DTEND);
    return {
      titulo: e.SUMMARY || '',
      lugar: e.LOCATION || '',
      descripcion: e.DESCRIPTION || null,
      fecha_evento: inicio.fecha,
      hora: inicio.hora,
      fecha_cierre: fin.fecha && fin.fecha !== inicio.fecha ? fin.fecha : null,
      fuente_url: e.URL || null
    };
  });
}
