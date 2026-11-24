/**
 * REGLA DEL PROYECTO: NO FIGURAN EVENTOS GENÉRICOS.
 *
 * Un título es genérico si describe una categoría, un formato o el propio lugar, pero no un evento concreto.
 * Ejemplos que NO se cargan: "Colección Permanente", "Exposiciones", "Exhibiciones actuales",
 * "Taller", "Visitas guiadas", "Agenda", "Teatro Colón" (el nombre del propio venue).
 *
 * Esta es la ÚNICA fuente de verdad de la regla. La usan el validador (validator.js)
 * y la fuente GCBA (sources/gcba.js). No duplicar la lista en otro lado.
 */

const norm = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Palabras que, por sí solas, no identifican un evento concreto.
const PALABRAS_GENERICAS = new Set([
  'coleccion', 'permanente', 'permanentes', 'exposicion', 'exposiciones', 'exhibicion', 'exhibiciones',
  'muestra', 'muestras', 'agenda', 'actividad', 'actividades', 'programacion', 'cartelera',
  'evento', 'eventos', 'visita', 'visitas', 'guiada', 'guiadas', 'taller', 'talleres',
  'charla', 'charlas', 'show', 'shows', 'concierto', 'conciertos', 'recital', 'recitales',
  'funcion', 'funciones', 'obra', 'obras', 'actual', 'actuales', 'proximo', 'proximos',
  'gratis', 'gratuita', 'gratuitas', 'gratuito', 'entrada', 'entradas', 'libre',
  'museo', 'centro', 'cultural', 'arte', 'sala', 'teatro', 'fundacion', 'nacional',
  'en', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'a', 'al', 'con', 'para', 'por'
]);

/**
 * @param {string} titulo - título del evento tal como lo extrajo el scraper
 * @param {string} [lugar] - nombre del venue; si el título es igual al venue, es genérico
 * @returns {boolean} true si el título NO identifica un evento concreto
 */
export function esGenerico(titulo, lugar = '') {
  const t = norm(titulo);
  if (!t) return true;
  if (lugar && t === norm(lugar)) return true;
  return t.split(' ').every((w) => PALABRAS_GENERICAS.has(w));
}
