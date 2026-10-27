import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || 'https://boeurmldeqvcaikdhtvy.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno.");
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

/**
 * Carga todos los venues existentes de la tabla 'lugares'
 */
export async function getVenuesSet(supabase) {
  const { data, error } = await supabase
    .from('lugares')
    .select('nombre');

  if (error) throw error;
  return new Set((data || []).map(l => l.nombre.trim()));
}

/**
 * Carga todos los eventos actuales de Supabase
 */
export async function getCurrentEvents(supabase) {
  const { data, error } = await supabase
    .from('eventos')
    .select('*');

  if (error) throw error;
  return data || [];
}

/**
 * Calcula si una fecha está dentro de los próximos 7 días
 */
export function calculateEsProximo(fechaEvento) {
  if (!fechaEvento || fechaEvento === '2026-01-01') return false;
  const eventDate = new Date(fechaEvento + 'T00:00:00Z');
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const diffDays = (eventDate - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

/**
 * Sincroniza eventos validados con Supabase
 */
export async function syncEventsWithSupabase(supabase, validEvents, options = {}) {
  const { isDryRun = false } = options;
  const existingEvents = await getCurrentEvents(supabase);

  // Indexar eventos existentes por clave: `${titulo}|${lugar}|${fecha_evento}`
  const existingMap = new Map();
  for (const ev of existingEvents) {
    const key = `${ev.titulo.trim().toLowerCase()}|${ev.lugar.trim().toLowerCase()}|${ev.fecha_evento || ''}`;
    existingMap.set(key, ev);
  }

  const toInsert = [];
  const toUpdate = [];
  const processedKeys = new Set();

  for (const ev of validEvents) {
    const key = `${ev.titulo.trim().toLowerCase()}|${ev.lugar.trim().toLowerCase()}|${ev.fecha_evento || ''}`;
    processedKeys.add(key);

    const existing = existingMap.get(key);
    const esProximo = calculateEsProximo(ev.fecha_evento);

    if (!existing) {
      // Evento nuevo -> entra con estado 'pendiente'
      // ⚠️ REGLA CRÍTICA: NO TOCAR instagram_url (se deja undefined / null)
      toInsert.push({
        lugar: ev.lugar,
        titulo: ev.titulo,
        descripcion: ev.descripcion || null,
        fecha_evento: ev.fecha_evento,
        fecha_cierre: ev.fecha_cierre || null,
        hora: ev.hora || null,
        precio: ev.precio || null,
        entrada_url: ev.entrada_url || null,
        tipo_evento: ev.tipo_evento || null,
        fuente_url: ev.fuente_url,
        imagen_url: ev.imagen_url || null,
        estado: 'aprobado',
        es_proximo: esProximo
      });
    } else {
      // Comprobar si cambiaron campos relevantes
      let changed = false;
      const patch = {};

      if (ev.hora && ev.hora !== existing.hora) { patch.hora = ev.hora; changed = true; }
      if (ev.precio && ev.precio !== existing.precio) { patch.precio = ev.precio; changed = true; }
      if (ev.entrada_url && ev.entrada_url !== existing.entrada_url) { patch.entrada_url = ev.entrada_url; changed = true; }
      if (ev.fecha_cierre && ev.fecha_cierre !== existing.fecha_cierre) { patch.fecha_cierre = ev.fecha_cierre; changed = true; }
      if (existing.es_proximo !== esProximo) { patch.es_proximo = esProximo; changed = true; }

      if (changed) {
        // ⚠️ REGLA CRÍTICA: NUNCA incluir instagram_url en la actualización
        toUpdate.push({ id: existing.id, titulo: existing.titulo, lugar: existing.lugar, patch });
      }
    }
  }

  // Identificar eventos para eliminar:
  // Vencidos (que no sean recurrentes '2026-01-01')
  const toDelete = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  for (const existing of existingEvents) {
    // Si es recurrente '2026-01-01', NUNCA se elimina por vencimiento
    if (existing.fecha_evento === '2026-01-01') continue;

    if (existing.fecha_evento) {
      const eventDate = new Date(existing.fecha_evento + 'T00:00:00Z');
      const cierreDate = existing.fecha_cierre ? new Date(existing.fecha_cierre + 'T23:59:59Z') : null;

      const expired = cierreDate ? (cierreDate < now) : (eventDate < now);
      if (expired) {
        toDelete.push(existing);
      }
    }
  }

  // ⚠️ REGLA CRÍTICA DE BORRADO (CIRCUIT BREAKER):
  // Si en una corrida van a borrarse más de 20 eventos, NO borrar; avisar y esperar confirmación.
  let deleteBlockedByCircuitBreaker = false;
  if (toDelete.length > 20) {
    deleteBlockedByCircuitBreaker = true;
  }

  // Ejecutar operaciones si no es dry-run
  if (!isDryRun) {
    // 1. Inserts
    if (toInsert.length > 0) {
      const { data: insertados, error: insErr } = await supabase
        .from('eventos')
        .insert(toInsert)
        .select('id, titulo, lugar, fecha_evento');
      if (insErr) throw insErr;

      // Asignar el id generado a cada evento, para usarlo en los botones de Telegram
      const keyOf = (t, l, f) => `${t.trim().toLowerCase()}|${l.trim().toLowerCase()}|${f || ''}`;
      const idByKey = new Map((insertados || []).map(r => [keyOf(r.titulo, r.lugar, r.fecha_evento), r.id]));
      for (const ev of toInsert) {
        ev.id = idByKey.get(keyOf(ev.titulo, ev.lugar, ev.fecha_evento));
      }
    }

    // 2. Updates
    for (const item of toUpdate) {
      const { error: upErr } = await supabase
        .from('eventos')
        .update(item.patch)
        .eq('id', item.id);
      if (upErr) console.error(`Error actualizando evento ${item.id}:`, upErr);
    }

    // 3. Deletes (solo si no superó los 20)
    if (toDelete.length > 0 && !deleteBlockedByCircuitBreaker) {
      const ids = toDelete.map(d => d.id);
      const { error: delErr } = await supabase
        .from('eventos')
        .delete()
        .in('id', ids);
      if (delErr) console.error("Error eliminando eventos vencidos:", delErr);
    }
  }

  // Recalcular total de eventos activos en Supabase
  const totalActivos = existingEvents.length + (isDryRun ? 0 : toInsert.length) - (isDryRun || deleteBlockedByCircuitBreaker ? 0 : toDelete.length);

  return {
    toInsert,
    toUpdate,
    toDelete,
    deleteBlockedByCircuitBreaker,
    totalActivos
  };
}
