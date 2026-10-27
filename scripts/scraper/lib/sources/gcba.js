/**
 * Capa 1: datos abiertos del GCBA (Buenos Aires Data, CKAN).
 * Resuelve la URL real del recurso con package_show. Solo devuelve eventos de venues del catálogo.
 */
import { parseSpanishDate, normalizeHora } from '../fechas.js';
import { parseICS } from '../ics.js';

const CKAN = 'https://data.buenosaires.gob.ar/api/3/action/package_show?id=';
const UA = { 'User-Agent': 'RadarCulturalBot/1.0 (agenda cultural; contacto: datosabiertos)' };

export const FUENTES_GCBA = [
  { nombre: 'Teatro Colón (programación)', dataset: 'teatro-colon-programacion-actual', formatos: ['ICS'], tipo: 'ics', lugarFijo: 'Teatro Colón' },
  { nombre: 'Actividades Culturales (Min. Cultura)', dataset: 'actividades-culturales', formatos: ['CSV'], tipo: 'csv' },
  { nombre: 'Complejo Teatral', dataset: 'complejo-teatral', formatos: ['CSV'], tipo: 'csv' }
];

// Texto del dataset -> nombre exacto del venue en la tabla 'lugares'. Lo no reconocido se descarta.
const MAPA_LUGARES = [
  { patron: /teatro san martin|teatro sarmiento|teatro regio|de la ribera/, lugar: null }, // Complejo Teatral: no confundir con el CC San Martín
  { patron: /colon/, lugar: 'Teatro Colón' },
  { patron: /recoleta/, lugar: 'Centro Cultural Recoleta' },
  { patron: /centro cultural san martin/, lugar: 'Centro Cultural San Martín' },
  { patron: /usina del arte/, lugar: 'Usina del Arte' },
  { patron: /palacio libertad|\bcck\b/, lugar: 'Palacio Libertad (CCK)' },
  { patron: /mamba|moderno/, lugar: 'Museo de Arte Moderno' }
];

const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function mapLugar(texto) {
  const t = sinAcentos(texto);
  for (const { patron, lugar } of MAPA_LUGARES) {
    if (patron.test(t)) return lugar;
  }
  return null;
}

/** Parser CSV con comillas. Detecta separador ',' o ';' por la cabecera. */
export function parseCSV(texto) {
  const primera = String(texto).split(/\r?\n/, 1)[0] || '';
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((c) => c.trim() !== ''));
}

const SINONIMOS = {
  titulo: ['titulo', 'nombre', 'evento', 'espectaculo', 'obra', 'actividad'],
  fecha: ['fecha', 'fecha_inicio', 'fecha inicio', 'dia', 'inicio'],
  fecha_fin: ['fecha_fin', 'fecha fin', 'fecha_cierre', 'hasta', 'fin'],
  hora: ['hora', 'horario', 'hora_inicio', 'hora inicio'],
  lugar: ['lugar', 'sala', 'espacio', 'sede', 'venue', 'establecimiento'],
  link: ['url', 'link', 'enlace', 'web', 'sitio']
};

function columnas(cabecera) {
  const norm = cabecera.map((h) => sinAcentos(h));
  const buscar = (claves) => {
    for (const k of claves) {
      const i = norm.findIndex((h) => h === sinAcentos(k));
      if (i >= 0) return i;
    }
    return -1;
  };
  return Object.fromEntries(Object.entries(SINONIMOS).map(([k, v]) => [k, buscar(v)]));
}

/** CSV -> eventos normalizados. Lanza error si no reconoce título o fecha. */
export function csvToEventos(texto, { lugarFijo = null } = {}) {
  const filas = parseCSV(texto);
  if (filas.length < 2) throw new Error('CSV vacío');
  const col = columnas(filas[0]);
  if (col.titulo < 0 || col.fecha < 0) {
    throw new Error(`columnas no reconocidas: ${filas[0].slice(0, 8).join(' | ')}`);
  }

  const eventos = [];
  for (const f of filas.slice(1)) {
    const get = (i) => (i >= 0 && f[i] ? f[i].trim() : '');
    const titulo = get(col.titulo);
    const fecha = parseSpanishDate(get(col.fecha));
    if (!titulo || !fecha) continue;

    eventos.push({
      titulo,
      lugar: lugarFijo || mapLugar(get(col.lugar)),
      descripcion: null,
      fecha_evento: fecha,
      fecha_cierre: parseSpanishDate(get(col.fecha_fin)),
      hora: normalizeHora(get(col.hora)),
      fuente_url: get(col.link) || null,
      entrada_url: null,
      imagen_url: null,
      precio: null
    });
  }
  return eventos;
}

export function icsToEventos(texto, { lugarFijo = null } = {}) {
  return parseICS(texto)
    .filter((e) => e.titulo && e.fecha_evento)
    .filter((e) => e.lugar || lugarFijo)
    .map((e) => ({
      ...e,
      lugar: mapLugar(e.lugar) || lugarFijo,
      imagen_url: null,
      entrada_url: null,
      precio: null
    }));
}

/**
 * FILTRO OBLIGATORIO: solo se quedan eventos cuyo lugar existe en el catálogo (validVenuesSet),
 * con título, fecha válida y no vencidos. Puro: no hace red ni escribe en la base.
 */
export function filtrarPorCatalogo(eventos, validVenuesSet, hoy) {
  const aceptados = [];
  let descartados = 0;
  for (const ev of eventos) {
    if (!ev.lugar || !validVenuesSet.has(ev.lugar)) { descartados++; continue; }
    if (!ev.titulo || !ev.fecha_evento) { descartados++; continue; }
    const permanente = ev.fecha_evento === '2026-01-01';
    const ref = ev.fecha_cierre || ev.fecha_evento;
    if (!permanente && ref < hoy) { descartados++; continue; }
    aceptados.push(ev);
  }
  return { aceptados, descartados };
}

// Texto seguro para Telegram (sin <, > ni &, y corto)
const seguro = (t) => String(t || '').replace(/[<>&]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

/** Resuelve las URLs de TODOS los recursos del formato pedido desde CKAN. */
export async function recursosUrls(dataset, formato) {
  const res = await fetch(CKAN + encodeURIComponent(dataset), { headers: UA, signal: AbortSignal.timeout(20000) });
  const tipo = res.headers.get('content-type') || '';
  if (!res.ok) throw new Error(`CKAN ${dataset}: HTTP ${res.status} (${seguro(tipo)})`);
  const cuerpo = await res.text();
  if (!cuerpo.trim().startsWith('{')) {
    throw new Error(`CKAN ${dataset}: respuesta no JSON (${seguro(tipo)}): ${seguro(cuerpo)}`);
  }
  const json = JSON.parse(cuerpo);
  if (!json.success) throw new Error(`CKAN ${dataset}: respuesta sin éxito`);
  const urls = (json.result?.resources || [])
    .filter((x) => String(x.format || '').toUpperCase() === formato && x.url)
    .map((x) => x.url);
  if (urls.length === 0) throw new Error(`sin recursos ${formato} en ${dataset}`);
  return urls;
}

async function descargar(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`descarga HTTP ${res.status}`);
  return res.text();
}

/** ICS: lee todos los calendarios del dataset. Un calendario que falla no frena a los demás. */
async function leerFuente(fuente) {
  if (fuente.tipo === 'csv') {
    const [url] = await recursosUrls(fuente.dataset, fuente.formatos[0]);
    return csvToEventos(await descargar(url), { lugarFijo: fuente.lugarFijo });
  }
  const urls = await recursosUrls(fuente.dataset, fuente.formatos[0]);
  const eventos = [];
  let fallidos = 0;
  for (const url of urls) {
    try {
      eventos.push(...icsToEventos(await descargar(url), { lugarFijo: fuente.lugarFijo }));
    } catch {
      fallidos++;
    }
  }
  if (fallidos === urls.length) throw new Error(`ningún calendario se pudo leer (${fallidos}/${urls.length})`);
  console.log(`🏛️ [GCBA] ${fuente.nombre}: ${urls.length - fallidos}/${urls.length} calendarios leídos`);
  return eventos;
}

/**
 * Punto de entrada para index.js. Nunca lanza: cada fuente que falla se devuelve en `fallos`.
 * @returns { eventos, fallos: [{ nombre, error }], descartados }
 */
export async function obtenerEventosGCBA(validVenuesSet, hoy) {
  const eventos = [];
  const fallos = [];
  let descartados = 0;

  for (const fuente of FUENTES_GCBA) {
    try {
      const crudos = await leerFuente(fuente);
      const { aceptados, descartados: d } = filtrarPorCatalogo(crudos, validVenuesSet, hoy);
      eventos.push(...aceptados);
      descartados += d;
      console.log(`🏛️ [GCBA] ${fuente.nombre}: ${aceptados.length} aceptados, ${d} descartados`);
    } catch (err) {
      fallos.push({ nombre: fuente.nombre, error: err.message });
      console.log(`🏛️ [GCBA] ${fuente.nombre}: ✗ ${err.message}`);
    }
  }
  return { eventos, fallos, descartados };
}
