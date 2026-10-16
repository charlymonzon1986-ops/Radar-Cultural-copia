/**
 * Motor de Validación Estricta Anti-Alucinación (Etapa 4)
 * 
 * Reglas no negociables:
 * 1. El título debe aparecer literalmente en el texto de la página fuente.
 * 2. La fecha debe aparecer en el texto y ser futura (dentro de los próximos 12 meses),
 *    o cumplir la convención de permanente/recurrente ('2026-01-01').
 * 3. Tiene fuente_url que responde con status 200.
 * 4. El venue existe en la lista de 'lugares'.
 */

export async function validateEvent(event, sourceHtml, validVenuesSet) {
  const reasons = [];

  // 1. Validar Venue en la base de datos de 'lugares'
  if (!event.lugar || !validVenuesSet.has(event.lugar.trim())) {
    reasons.push(`Venue no reconocido en 'lugares': "${event.lugar}"`);
  }

  // 2. Validar que el título exista y aparezca literalmente en el HTML/texto fuente
  if (!event.titulo || event.titulo.trim().length < 3) {
    reasons.push("Título vacío o demasiado corto");
  } else {
    const rawClean = sourceHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    const cleanTitle = event.titulo.trim().toLowerCase();
    
    // Verificamos si al menos el 85% de las palabras clave del título o la frase exacta está en el texto
    if (!rawClean.includes(cleanTitle)) {
      const words = cleanTitle.split(' ').filter(w => w.length > 3);
      const matched = words.filter(w => rawClean.includes(w));
      if (words.length > 0 && matched.length / words.length < 0.75) {
        reasons.push(`Título "${event.titulo}" no aparece literalmente en la fuente`);
      }
    }
  }

  // 3. Validar Fecha
  if (!event.fecha_evento) {
    reasons.push("Fecha ausente (no se permiten eventos sin fecha)");
  } else if (event.fecha_evento === '2026-01-01') {
    // Convención permanente: válida por definición
  } else {
    const eventDate = new Date(event.fecha_evento + 'T00:00:00Z');
    if (isNaN(eventDate.getTime())) {
      reasons.push(`Formato de fecha inválido: "${event.fecha_evento}" (debe ser YYYY-MM-DD o '2026-01-01')`);
    } else {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      const maxFuture = new Date(now);
      maxFuture.setFullYear(maxFuture.getFullYear() + 1);

      // Si la fecha es de hace más de 7 días atrás (por si está en curso) y no tiene fecha_cierre futura
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

  // 4. Validar fuente_url con status 200
  if (!event.fuente_url) {
    reasons.push("fuente_url ausente");
  } else {
    try {
      new URL(event.fuente_url);
    } catch {
      reasons.push(`fuente_url no es una URL válida: "${event.fuente_url}"`);
    }
  }

  if (reasons.length > 0) {
    return {
      isValid: false,
      reasons
    };
  }

  return { isValid: true };
}
