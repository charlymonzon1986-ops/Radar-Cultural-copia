#!/usr/bin/env node
/**
 * Valida una hoja de eventos cargada a mano (CSV) ANTES de aprobarla.
 * No escribe en la base: solo produce archivos de salida para revisar.
 *
 * Uso:
 *   node validar_csv.mjs eventos.csv --lugares lugares.json [--out salida]
 *
 * eventos.csv: columnas (en cualquier orden, sin distinguir mayúsculas):
 *   venue, titulo, fecha_evento, fecha_cierre, hora, fuente_url, entrada_url, precio, descripcion, tipo_evento
 *
 * lugares.json: array de nombres de venue tal como están en la tabla `lugares`.
 *
 * Salida:
 *   <out>/validos.json    eventos listos para revisar y aprobar (con advertencias)
 *   <out>/rechazos.csv    eventos que no pasan, con el motivo
 *   resumen por consola, agrupado por motivo
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const input = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--lugares' && args[i - 1] !== '--out');
const lugaresPath = flag('lugares');
const outDir = flag('out') || 'salida';

if (!input || !lugaresPath) {
  console.error('Uso: node validar_csv.mjs eventos.csv --lugares lugares.json [--out carpeta]');
  process.exit(1);
}

// Fecha de hoy en Buenos Aires, formato AAAA-MM-DD
const HOY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const SENTINEL = '2026-01-01'; // evento permanente / recurrente (convención del proyecto)
const MAX_DIAS = 365;          // ventana máxima hacia adelante
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const GENERICOS = /^(evento|exposici[oó]n|muestra|espect[aá]culo|agenda|programaci[oó]n|show)$/i;

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const esFecha = (s) => ISO.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

const esUrlAbsoluta = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

// CSV con comillas, saltos de línea dentro de campos y BOM
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (comillas) {
      if (c === '"' && text[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') {
      comillas = true;
    } else if (c === ',') {
      fila.push(campo); campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      filas.push(fila); fila = [];
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }

  const conDatos = filas.filter((f) => f.some((x) => x.trim() !== ''));
  const [cabecera, ...cuerpo] = conDatos;
  const claves = cabecera.map((h) => h.trim().toLowerCase());
  return cuerpo.map((f, idx) => {
    const obj = { _fila: idx + 2 }; // +2: cabecera es la fila 1
    claves.forEach((k, j) => { obj[k] = (f[j] ?? '').trim(); });
    return obj;
  });
}

function validar(ev, lugares, vistos) {
  const errores = [];
  const advertencias = [];

  if (!ev.venue) {
    errores.push('Venue vacío');
  } else if (!lugares.has(norm(ev.venue))) {
    errores.push(`Venue no reconocido: "${ev.venue}" (no está en lugares)`);
  }

  if (!ev.titulo || ev.titulo.length < 4 || GENERICOS.test(ev.titulo)) {
    errores.push('Título vacío o genérico');
  }

  if (!ev.fecha_evento) {
    errores.push('Sin fecha de inicio');
  } else if (!esFecha(ev.fecha_evento)) {
    errores.push(`Fecha de inicio inválida: "${ev.fecha_evento}" (usar AAAA-MM-DD)`);
  }

  if (ev.fecha_cierre && !esFecha(ev.fecha_cierre)) {
    errores.push(`Fecha de cierre inválida: "${ev.fecha_cierre}" (usar AAAA-MM-DD)`);
  }

  const esPermanente = ev.fecha_evento === SENTINEL;
  if (ev.fecha_evento && esFecha(ev.fecha_evento) && !esPermanente) {
    const cierre = ev.fecha_cierre && esFecha(ev.fecha_cierre) ? ev.fecha_cierre : ev.fecha_evento;
    if (cierre < HOY) {
      errores.push(`Ya finalizado: cierra el ${cierre}`);
    }
    const dias = (Date.parse(cierre) - Date.parse(HOY)) / 864e5;
    if (dias > MAX_DIAS) {
      errores.push('Fuera de ventana: más de 12 meses adelante');
    }
  }

  if (!ev.fecha_cierre && !esPermanente) {
    advertencias.push('Sin fecha de cierre: completar desde la fuente antes de aprobar');
  }

  if (!ev.fuente_url) {
    errores.push('Falta fuente_url');
  } else if (!esUrlAbsoluta(ev.fuente_url)) {
    errores.push(`fuente_url inválida: "${ev.fuente_url}"`);
  } else {
    const ruta = new URL(ev.fuente_url).pathname;
    if (ruta === '/' || ruta === '') {
      advertencias.push('fuente_url es la página principal, no la del evento');
    }
  }

  const clave = `${norm(ev.venue)}|${norm(ev.titulo)}|${ev.fecha_evento}`;
  if (vistos.has(clave)) {
    errores.push(`Duplicado dentro de la hoja (ya está en la fila ${vistos.get(clave)})`);
  } else {
    vistos.set(clave, ev._fila);
  }

  return { errores, advertencias };
}

// --- Ejecución ---
const lugares = new Set(JSON.parse(fs.readFileSync(lugaresPath, 'utf8')).map(norm));
const filas = parseCSV(fs.readFileSync(input, 'utf8'));
const vistos = new Map();

const validos = [];
const rechazos = [];

for (const ev of filas) {
  const { errores, advertencias } = validar(ev, lugares, vistos);
  if (errores.length === 0) {
    validos.push({ ...ev, advertencias });
  } else {
    rechazos.push({ ...ev, motivos: errores });
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'validos.json'), JSON.stringify(validos, null, 2), 'utf8');

const celda = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const csvRechazos = [
  'fila,venue,titulo,motivos',
  ...rechazos.map((r) => [r._fila, celda(r.venue), celda(r.titulo), celda(r.motivos.join(' | '))].join(','))
].join('\n');
fs.writeFileSync(path.join(outDir, 'rechazos.csv'), '﻿' + csvRechazos + '\n', 'utf8');

// Resumen agrupado por motivo
const porMotivo = new Map();
for (const r of rechazos) {
  for (const m of new Set(r.motivos.map((x) => x.split(':')[0]))) {
    porMotivo.set(m, (porMotivo.get(m) || 0) + 1);
  }
}
const advPorMotivo = new Map();
for (const v of validos) {
  for (const a of v.advertencias) {
    const k = a.split(':')[0];
    advPorMotivo.set(k, (advPorMotivo.get(k) || 0) + 1);
  }
}

console.log(`Hoy (BA): ${HOY}`);
console.log(`Filas leídas: ${filas.length}`);
console.log(`Válidos: ${validos.length}  |  Rechazados: ${rechazos.length}`);
if (porMotivo.size) {
  console.log('\nRechazos por motivo:');
  for (const [m, n] of [...porMotivo].sort((a, b) => b[1] - a[1])) console.log(`  - ${m}: ${n}`);
}
if (advPorMotivo.size) {
  console.log('\nAdvertencias en válidos (revisar antes de aprobar):');
  for (const [m, n] of [...advPorMotivo].sort((a, b) => b[1] - a[1])) console.log(`  - ${m}: ${n}`);
}
console.log(`\nArchivos: ${path.join(outDir, 'validos.json')} y ${path.join(outDir, 'rechazos.csv')}`);
