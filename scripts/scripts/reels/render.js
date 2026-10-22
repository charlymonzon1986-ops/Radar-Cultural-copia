/**
 * Renderiza un reel.
 *
 * Modo 1 (GitHub Actions): EVENTO_ID=<uuid> CREDITO=@cuenta node render.js salida.mp4
 *   Lee el evento de Supabase (solo si está aprobado y tiene imagen).
 *
 * Modo 2 (pruebas): node render.js '<json de props>' salida.mp4
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, ensureBrowser } from '@remotion/renderer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const salida = process.argv[3] || (process.argv[2] && !process.argv[2].startsWith('{') ? process.argv[2] : path.join(here, 'out.mp4'));

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatFecha(f) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f || '');
  if (!m) return f || '';
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}`;
}

async function propsDesdeSupabase(eventoId, credito) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  const res = await fetch(`${url}/rest/v1/eventos?id=eq.${eventoId}&select=titulo,lugar,fecha_evento,hora,imagen_url,estado`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const rows = await res.json();
  const ev = rows[0];
  if (!ev) throw new Error(`No existe el evento ${eventoId}.`);
  if (ev.estado !== 'aprobado') throw new Error(`El evento no está aprobado (estado: ${ev.estado}).`);
  if (!ev.imagen_url) throw new Error('El evento no tiene imagen.');
  return {
    titulo: ev.titulo,
    lugar: ev.lugar,
    fecha: formatFecha(ev.fecha_evento),
    hora: ev.hora || '',
    imagen: ev.imagen_url,
    credito: credito || ''
  };
}

async function verificarImagen(url) {
  const res = await fetch(url, { method: 'GET' }).catch(() => null);
  if (!res || !res.ok) throw new Error(`La imagen ya no está disponible (${res ? res.status : 'sin conexión'}). Los links de Instagram vencen.`);
}

let props;
if (process.env.EVENTO_ID) {
  props = await propsDesdeSupabase(process.env.EVENTO_ID, process.env.CREDITO);
} else {
  props = JSON.parse(process.argv[2] || '{}');
}
if (props.imagen) await verificarImagen(props.imagen);

// En GitHub Actions Remotion descarga su Chrome. Si REMOTION_BROWSER está definido, usa ese ejecutable (pruebas locales).
const browserExecutable = process.env.REMOTION_BROWSER || null;
if (!browserExecutable) await ensureBrowser();

const serveUrl = await bundle({ entryPoint: path.join(here, 'src/index.jsx') });
const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps: props, browserExecutable });
await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: salida, inputProps: props, browserExecutable });
console.log(`✅ Render listo: ${salida}`);
