/**
 * Motor de Validación Estricta Anti-Alucinación (Etapa 4)
 *
 * Reglas no negociables:
 * 1. El título debe aparecer en el texto de la página fuente (con tolerancia mínima de palabras).
 * 2. El título NO puede ser genérico (ver genericos.js). Regla del proyecto.
 * 3. La fecha debe ser válida y futura (dentro de los próximos 12 meses),
 *    o cumplir la convención de permanente/recurrente ('2026-01-01').
 * 4. fuente_url debe ser una URL absoluta y responder. Rechaza 404/410/5xx.
 *    No rechaza 403/429 (sitios que bloquean bots) ni timeouts: esos casos se loguean.
 * 5. El venue existe en la lista de 'lugares'.
 */
import { esGenerico } from './genericos.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; RadarCulturalBot/1.0; agenda cultural)' };
const cacheUrl = new Map(); // una verificación por URL por corrida

const norm = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Devuelve el motivo de rechazo por la URL, o null si está bien. */
async function revisarUrl(url) {
  if (cacheUrl.has(url)) return cacheUrl.get(url);
  let motivo = null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: UA,
      signal: AbortSignal.timeout(10000)
    });
    try { await res.body?.cancel(); } catch { /* ignorar */ }
    if (res.status === 404 || res.status === 410 || res.status >= 500) {
      motivo = `fuente_url responde ${res.status}`;
    }
  } catch (err) {
    console.warn(`[validator] no pude verificar ${url}: ${err.name === 'TimeoutError' ? 'timeout' : err.message}`);
  }
  cacheUrl.set(url, motivo);
  return motivo;
}

export async function validateEvent(event, sourceHtml, validVenuesSet) {
  const reasons = [];

  // 1. Venue en la tabla 'lugares'
  if (!event.lugar || !validVenuesSet.has(event.lugar.trim())) {
    reasons.push(`Venue no reconocido en 'lugares': "${event.lugar}"`);
  }

  // 2. Título: no vacío, no genérico, y presente en la fuente
  if (!event.titulo || event.titulo.trim().length < 3) {
    reasons.push('Título vacío o demasiado corto');
  } else if (esGenerico(event.titulo, event.lugar)) {
    reasons.push(`Título genérico, no es un evento concreto: "${event.titulo}"`);
  } else {
    const rawClean = norm(sourceHtml.replace(/<[^>]+>/g, ' '));
    const cleanTitle = norm(event.titulo);
    if (!rawClean.includes(cleanTitle)) {
      // Tolerancia: al menos 90% de las palabras de más de 3 letras deben aparecer en la fuente
      const words = cleanTitle.split(' ').filter((w) => w.length > 3);
      const matched = words.filter((w) => rawClean.includes(w));
      if (words.length === 0 || matched.length / words.length < 0.9) {
        reasons.push(`Título "${event.titulo}" no aparece en la fuente`);
      }
    }
  }

  // 3. Fecha
  if (!event.fecha_evento) {
    reasons.push('Fecha ausente (no se permiten eventos sin fecha)');
  } else if (event.fecha_evento === '2026-01-01') {
    // Convención permanente/recurrente: válida por definición
  } else {
    const eventDate = new Date(event.fecha_evento + 'T00:00:00Z');
    if (isNaN(eventDate.getTime())) {
      reasons.push(`Formato de fecha inválido: "${event.fecha_evento}" (debe ser YYYY-MM-DD o '2026-01-01')`);
    } else {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      const maxFuture = new Date(now);
      maxFuture.setFullYear(maxFuture.getFullYear() + 1);

      if (eventDate < now) {
        if (event.fecha_cierre) {
          const cierreDate = new Date(event.fecha_cierre + 'T23:59:59Z');
          if (cierreDate < now) {
            reasons.push(`Evento finalizado (cierre fue el ${event.fecha_cierre})`);
          }
        } else {
          reasons.push(`Fecha pasada (${event.fecha_evento})`);
        }
      } else if (eventDate > maxFuture) {
        reasons.push(`Fecha excede la ventana de 12 meses (${event.fecha_evento})`);
      }
    }
  }

  // 4. fuente_url: absoluta y que responda
  if (!event.fuente_url) {
    reasons.push('fuente_url ausente');
  } else {
    try {
      new URL(event.fuente_url);
      const motivo = await revisarUrl(event.fuente_url);
      if (motivo) reasons.push(motivo);
    } catch {
      reasons.push(`fuente_url no es una URL válida: "${event.fuente_url}"`);
    }
  }

  if (reasons.length > 0) {
    return { isValid: false, reasons };
  }
  return { isValid: true };
}
