/**
 * Parseo de fechas y horas en español. Funciones puras, sin red ni base de datos.
 * Principio: ante la duda, devolver null. Un null va a "Dudosos" y no se carga.
 */

const MESES = {
  'ene': '01', 'enero': '01',
  'feb': '02', 'febrero': '02',
  'mar': '03', 'marzo': '03',
  'abr': '04', 'abril': '04',
  'may': '05', 'mayo': '05',
  'jun': '06', 'junio': '06',
  'jul': '07', 'julio': '07',
  'ago': '08', 'agosto': '08',
  'sep': '09', 'septiembre': '09', 'setiembre': '09',
  'oct': '10', 'octubre': '10',
  'nov': '11', 'noviembre': '11',
  'dic': '12', 'diciembre': '12'
};

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * Si la fecha no trae año, usa el año actual. Si esa fecha quedó más de 30 días atrás,
 * NO se asume el año siguiente: puede ser un evento pasado o el fin de un rango,
 * así que devuelve null (va a Dudosos para revisión manual).
 */
function inferirAnio(mes, dia, hoy) {
  const y = hoy.getUTCFullYear();
  const candidata = new Date(Date.UTC(y, mes - 1, dia));
  const hace30 = new Date(hoy.getTime() - 30 * 24 * 3600 * 1000);
  return candidata < hace30 ? null : y;
}

/**
 * Devuelve YYYY-MM-DD o null.
 * Acepta: "2026-10-24", "24/10/2026", "24 de octubre de 2026", "24 de octubre" y "sáb 24 oct"
 * (las fechas sin año solo se aceptan si no quedaron más de 30 días atrás).
 * NO acepta un número suelto ("16.") porque sería ambiguo: devuelve null.
 */
export function parseSpanishDate(text, hoy = new Date()) {
  if (!text) return null;
  const limpio = String(text).toLowerCase().trim();

  const isoMatch = limpio.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return iso(isoMatch[1], isoMatch[2], isoMatch[3]);

  const dmy = limpio.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) return iso(dmy[3], dmy[2], dmy[1]);

  // Día + mes, con borde de palabra para no confundir "mar" con "martes"
  for (const [nombre, numero] of Object.entries(MESES)) {
    const re = new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?${nombre}(?![a-zñáéíóú])(?:\\s*(?:de\\s+)?(\\d{4}))?`, 'i');
    const m = limpio.match(re);
    if (m) {
      const dia = Number(m[1]);
      const mes = Number(numero);
      if (dia < 1 || dia > 31) return null;
      const anio = m[2] ? Number(m[2]) : inferirAnio(mes, dia, hoy);
      if (!anio) return null; // fecha sin año y lejana: ambigua
      return iso(anio, mes, dia);
    }
  }

  return null;
}

/**
 * Normaliza la hora a HH:MM. Acepta "sáb_17.00 hs", "20:30", "21 hs", "21.30".
 * Si no reconoce una hora, devuelve null.
 */
export function normalizeHora(text) {
  if (!text) return null;
  const m = String(text).match(/(\d{1,2})(?:[.:](\d{2}))?\s*(?:hs|h\b|horas)?/i);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}
