/**
 * Interpretación de mensajes en español (reglas, sin APIs pagas) y validación de campos editables.
 */

export function normalize(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Campos que el bot puede modificar. instagram_url NUNCA está acá (regla crítica).
export const CAMPOS_EDITABLES = {
  titulo: { label: 'Título', tipo: 'texto' },
  lugar: { label: 'Lugar', tipo: 'texto' },
  precio: { label: 'Precio', tipo: 'texto' },
  hora: { label: 'Hora', tipo: 'hora' },
  fecha_evento: { label: 'Fecha evento', tipo: 'fecha' },
  fecha_cierre: { label: 'Fecha cierre', tipo: 'fecha_opcional' },
  entrada_url: { label: 'Link entradas', tipo: 'url_opcional' },
  tipo_evento: { label: 'Tipo', tipo: 'texto' }
};

export function validateField(campo, valorCrudo) {
  const def = CAMPOS_EDITABLES[campo];
  if (!def) return { ok: false, error: 'Campo no editable.' };
  const v = String(valorCrudo ?? '').trim();
  if (!v) return { ok: false, error: 'El valor está vacío.' };

  switch (def.tipo) {
    case 'texto':
      return v.length > 300 ? { ok: false, error: 'Texto demasiado largo.' } : { ok: true, value: v };
    case 'hora':
      return /^([01]?\d|2[0-3]):[0-5]\d$/.test(v) ? { ok: true, value: v } : { ok: false, error: 'Formato de hora: HH:MM (ej. 20:30).' };
    case 'fecha':
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'))
        ? { ok: true, value: v }
        : { ok: false, error: 'Formato de fecha: AAAA-MM-DD (ej. 2026-11-03).' };
    case 'fecha_opcional':
      if (normalize(v) === 'null' || normalize(v) === 'borrar') return { ok: true, value: null };
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'))
        ? { ok: true, value: v }
        : { ok: false, error: 'Fecha AAAA-MM-DD, o escribí "null" para borrarla.' };
    case 'url_opcional':
      if (normalize(v) === 'null' || normalize(v) === 'borrar') return { ok: true, value: null };
      return /^https?:\/\/\S+$/.test(v) ? { ok: true, value: v } : { ok: false, error: 'La URL tiene que empezar con http:// o https://, o escribí "null".' };
    default:
      return { ok: false, error: 'Tipo de campo desconocido.' };
  }
}

/**
 * Devuelve { intent, arg }.
 * intent: menu | estado | pendientes | vencidos | buscar | aprobar | rechazar | borrar | modificar | desconocido
 */
export function parseIntent(texto) {
  const t = normalize(texto).replace(/[¿¡?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\//, '');
  if (!t) return { intent: 'desconocido', arg: '' };

  if (/^(start|menu|ayuda|help|hola|inicio)$/.test(t)) return { intent: 'menu', arg: '' };
  if (/^(estado|resumen|total|cuantos|cuantos eventos|como estamos)/.test(t)) return { intent: 'estado', arg: '' };

  const [verbo, ...resto] = t.split(' ');
  const arg = resto.join(' ').trim();

  // "borra vencidos", "eliminar los vencidos", "limpiar vencidos"
  if (/vencid/.test(t) && /(borr|elimin|limpi|quit)/.test(t)) return { intent: 'vencidos', arg: '' };
  if (/^(pendiente|pendientes)$/.test(arg) || /^(mostra|muestra|ver|lista|listar)/.test(verbo) && /pendient/.test(t)) {
    return { intent: 'pendientes', arg: '' };
  }
  if (/^(pendientes?)$/.test(t)) return { intent: 'pendientes', arg: '' };

  // "hacé un reel de Biópera", "armá un clip de teatro colón"
  if (/^(hace|haz|arma|crea|genera|renderiza|quiero)/.test(verbo) && /\b(reel|clip|video)\b/.test(t)) {
    const limpio = resto.join(' ').replace(/\b(reel|clip|video|de|del|la|el|un|una|para)\b/g, ' ').replace(/\s+/g, ' ').trim();
    return { intent: 'reel', arg: limpio };
  }

  if (/^(aprob|aprueb)/.test(verbo)) return { intent: 'aprobar', arg };
  if (/^(rechaz|descart)/.test(verbo)) return { intent: 'rechazar', arg };
  if (/^(borr|elimin|quit)/.test(verbo)) return { intent: 'borrar', arg };
  if (/^(modific|cambi|edit|actualiz)/.test(verbo)) return { intent: 'modificar', arg };
  if (/^(busc|encuentr|mostr|ver)/.test(verbo)) return { intent: 'buscar', arg };

  return { intent: 'desconocido', arg: texto.trim() };
}

/** Extrae el crédito tipo @cuenta del texto (si existe). */
export function extraerCredito(texto = '') {
  const m = /@[\w.]+/.exec(texto);
  return m ? m[0] : '';
}
