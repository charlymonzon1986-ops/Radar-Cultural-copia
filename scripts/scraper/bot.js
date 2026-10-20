/**
 * Bot de Radar Cultural (Telegram). Corre cada pocos minutos desde GitHub Actions:
 * lee los mensajes y clics pendientes, ejecuta la acción y termina.
 */
import dotenv from 'dotenv';
import { getSupabaseClient } from './lib/database.js';
import { parseIntent, validateField, CAMPOS_EDITABLES, normalize, esc } from './lib/intents.js';

dotenv.config();

const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '').trim();
if (!token || !CHAT_ID) {
  console.error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID.');
  process.exit(1);
}

const MAX_BATCH = 200;
const VENCE_MIN = 24 * 60; // las acciones pendientes de confirmación vencen a las 24 h

// ---------- Telegram ----------
async function tg(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description || res.status}`);
  return data.result;
}

async function ensureNoWebhook() {
  const info = await tg('getWebhookInfo');
  if (info.url) {
    console.log(`Webhook activo (${info.url}). Se elimina para usar getUpdates.`);
    await tg('deleteWebhook');
  }
}

function send(text, teclado) {
  return tg('sendMessage', {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(teclado ? { reply_markup: { inline_keyboard: teclado } } : {})
  });
}

function answer(callbackId, text = '', alert = false) {
  return tg('answerCallbackQuery', { callback_query_id: callbackId, text, show_alert: alert });
}

async function markMessage(message, label) {
  if (!message) return;
  await tg('editMessageReplyMarkup', {
    chat_id: message.chat.id,
    message_id: message.message_id,
    reply_markup: { inline_keyboard: [[{ text: label, callback_data: 'done' }]] }
  }).catch(() => {});
}

// ---------- Helpers de datos ----------
const hoy = () => new Date().toISOString().slice(0, 10);

function esVencido(ev) {
  if (ev.fecha_evento === '2026-01-01') return false; // recurrentes nunca vencen
  const ref = ev.fecha_cierre || ev.fecha_evento;
  return !!ref && ref < hoy();
}

function escLike(s) {
  return s.replace(/[%_\\]/g, c => `\\${c}`);
}

async function buscarEventos(supabase, texto, { estado } = {}) {
  let q = supabase.from('eventos').select('id, titulo, lugar, fecha_evento, fecha_cierre, hora, precio, estado, entrada_url').ilike('titulo', `%${escLike(texto)}%`).limit(10);
  if (estado) q = q.eq('estado', estado);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function tarjetaEvento(ev) {
  const texto =
    `📌 <b>${esc(ev.titulo)}</b>\n` +
    `📍 ${esc(ev.lugar)}\n` +
    `📅 ${esc(ev.fecha_evento)}${ev.hora ? ' · ' + esc(ev.hora) : ''}` +
    (ev.fecha_cierre ? `\n🔚 Cierra: ${esc(ev.fecha_cierre)}` : '') +
    `\nEstado: <b>${esc(ev.estado)}</b>`;
  const filas = [];
  if (ev.estado === 'pendiente') {
    filas.push([{ text: '✅ Aprobar', callback_data: `approve:${ev.id}` }, { text: '❌ Rechazar', callback_data: `reject:${ev.id}` }]);
  }
  filas.push([{ text: '✏️ Modificar', callback_data: `mod:${ev.id}` }, { text: '🗑 Borrar', callback_data: `del:${ev.id}` }]);
  return { texto, filas };
}

async function mostrarEventos(lista, encabezado) {
  if (lista.length === 0) return send('No encontré eventos con eso.');
  await send(encabezado);
  for (const ev of lista) {
    const c = tarjetaEvento(ev);
    await send(c.texto, c.filas);
  }
}

// Acciones pendientes de confirmación/valor (tabla acciones_pendientes)
async function crearAccion(supabase, tipo, payload) {
  const { data, error } = await supabase
    .from('acciones_pendientes')
    .insert({ chat_id: CHAT_ID, tipo, payload, estado: 'pendiente' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function getAccion(supabase, id, tipo) {
  const { data } = await supabase.from('acciones_pendientes').select('*').eq('id', id).maybeSingle();
  if (!data || data.chat_id !== CHAT_ID || data.estado !== 'pendiente') return null;
  if (tipo && data.tipo !== tipo) return null;
  const edadMin = (Date.now() - new Date(data.creada_en).getTime()) / 60000;
  if (edadMin > VENCE_MIN) return null;
  return data;
}

async function cerrarAccion(supabase, id, estado) {
  await supabase.from('acciones_pendientes').update({ estado }).eq('id', id);
}

async function accionAbiertaValor(supabase) {
  const { data } = await supabase
    .from('acciones_pendientes')
    .select('*')
    .eq('chat_id', CHAT_ID)
    .eq('tipo', 'valor')
    .eq('estado', 'pendiente')
    .order('creada_en', { ascending: false })
    .limit(1);
  const a = data && data[0];
  if (!a) return null;
  return (Date.now() - new Date(a.creada_en).getTime()) / 60000 > VENCE_MIN ? null : a;
}

// ---------- Acciones de negocio ----------
async function pedirConfirmacionBorrado(supabase, ids, descripcion) {
  if (ids.length === 0) return send('No hay eventos para borrar.');
  if (ids.length > MAX_BATCH) return send(`Son ${ids.length} eventos. El límite por confirmación es ${MAX_BATCH}; hay que hacerlo en partes.`);
  const accId = await crearAccion(supabase, 'borrar', { ids });
  return send(
    `🗑 <b>¿Confirmás borrar ${ids.length} evento(s)?</b>\n${esc(descripcion)}\n\nEsta acción no se puede deshacer.`,
    [[{ text: `✅ Sí, borrar ${ids.length}`, callback_data: `cdel:${accId}` }, { text: '↩️ Cancelar', callback_data: `cancel:${accId}` }]]
  );
}

async function cambiarEstado(supabase, id, nuevoEstado) {
  const { data, error } = await supabase
    .from('eventos')
    .update({ estado: nuevoEstado })
    .eq('id', id)
    .eq('estado', 'pendiente')
    .select('id, titulo');
  if (error) throw error;
  return data && data[0];
}

async function menuPrincipal() {
  return send('👋 ¿Qué querés hacer? Podés escribirme, por ejemplo: <i>"borra los vencidos"</i>, <i>"aprobá Biópera"</i>, <i>"buscá teatro colón"</i>, <i>"modificá Biópera"</i>.', [
    [{ text: '📊 Estado', callback_data: 'menu:estado' }, { text: '⏳ Pendientes', callback_data: 'menu:pendientes' }],
    [{ text: '🗑 Borrar vencidos', callback_data: 'menu:vencidos' }]
  ]);
}

async function resumenEstado(supabase) {
  const { data, error } = await supabase.from('eventos').select('estado, fecha_evento, fecha_cierre');
  if (error) throw error;
  const total = data.length;
  const pend = data.filter(e => e.estado === 'pendiente').length;
  const venc = data.filter(esVencido).length;
  return send(`📊 <b>Estado</b>\nEventos activos: ${total}\nPendientes de aprobar: ${pend}\nVencidos para borrar: ${venc}`);
}

async function listarVencidos(supabase) {
  const { data, error } = await supabase.from('eventos').select('id, titulo, lugar, fecha_evento, fecha_cierre');
  if (error) throw error;
  const vencidos = data.filter(esVencido);
  if (vencidos.length === 0) return send('✅ No hay eventos vencidos.');
  const lista = vencidos.slice(0, 10).map(e => `• ${esc(e.titulo)} (${esc(e.lugar)}, ${esc(e.fecha_cierre || e.fecha_evento)})`).join('\n');
  const extra = vencidos.length > 10 ? `\n<i>…y ${vencidos.length - 10} más</i>` : '';
  return pedirConfirmacionBorrado(supabase, vencidos.map(e => e.id), `${lista}${extra}`);
}

async function listarPendientes(supabase) {
  const { data, error } = await supabase
    .from('eventos')
    .select('id, titulo, lugar, fecha_evento, fecha_cierre, hora, precio, estado, entrada_url')
    .eq('estado', 'pendiente')
    .order('fecha_evento')
    .limit(10);
  if (error) throw error;
  return mostrarEventos(data || [], `⏳ Pendientes de aprobar (hasta 10):`);
}

// ---------- Mensajes de texto ----------
async function handleMessage(supabase, msg) {
  if (String(msg.chat.id) !== CHAT_ID) {
    console.log(`Mensaje ignorado de chat no autorizado: ${msg.chat.id}`);
    return;
  }
  const texto = (msg.text || '').trim();
  if (!texto) return;

  // 1) ¿Estamos esperando un valor para modificar un evento?
  const esperando = await accionAbiertaValor(supabase);
  if (esperando && !texto.startsWith('/')) {
    const { evento_id, campo } = esperando.payload;
    const v = validateField(campo, texto);
    if (!v.ok) return send(`⚠️ ${esc(v.error)}\nEscribí el valor de nuevo, o /cancelar.`);
    const { error } = await supabase.from('eventos').update({ [campo]: v.value }).eq('id', evento_id);
    await cerrarAccion(supabase, esperando.id, error ? 'error' : 'ejecutada');
    if (error) return send(`❌ No se pudo guardar: ${esc(error.message)}`);
    return send(`✅ ${CAMPOS_EDITABLES[campo].label} actualizado a: ${esc(v.value ?? 'vacío')}`);
  }
  if (normalize(texto) === '/cancelar' || normalize(texto) === 'cancelar') {
    if (esperando) await cerrarAccion(supabase, esperando.id, 'cancelada');
    return send('↩️ Cancelado.');
  }

  // 2) Intención
  const { intent, arg } = parseIntent(texto);
  switch (intent) {
    case 'menu':
      return menuPrincipal();
    case 'estado':
      return resumenEstado(supabase);
    case 'pendientes':
      return listarPendientes(supabase);
    case 'vencidos':
      return listarVencidos(supabase);

    case 'buscar': {
      if (!arg) return send('¿Qué busco? Ejemplo: <i>buscá teatro colón</i>');
      return mostrarEventos(await buscarEventos(supabase, arg), `🔍 Resultados para "${esc(arg)}":`);
    }

    case 'aprobar':
    case 'rechazar': {
      if (!arg) return send(`¿Qué evento? Ejemplo: <i>${intent === 'aprobar' ? 'aprobá' : 'rechazá'} Biópera</i>`);
      const lista = await buscarEventos(supabase, arg, { estado: 'pendiente' });
      if (lista.length === 0) return send(`No encontré eventos pendientes con "${esc(arg)}".`);
      if (lista.length > 1) return mostrarEventos(lista, `Hay ${lista.length} coincidencias. Elegí cuál:`);
      const nuevo = intent === 'aprobar' ? 'aprobado' : 'rechazado';
      const ok = await cambiarEstado(supabase, lista[0].id, nuevo);
      return send(ok ? `${intent === 'aprobar' ? '✅' : '❌'} "${esc(ok.titulo)}" ${nuevo}.` : 'Ese evento ya no estaba pendiente.');
    }

    case 'borrar': {
      if (!arg) return send('¿Qué evento borro? Ejemplo: <i>borrá Biópera</i>');
      const lista = await buscarEventos(supabase, arg);
      if (lista.length === 0) return send(`No encontré eventos con "${esc(arg)}".`);
      if (lista.length > 1) return mostrarEventos(lista, `Hay ${lista.length} coincidencias. Elegí cuál borrar:`);
      return pedirConfirmacionBorrado(supabase, [lista[0].id], `${lista[0].titulo} (${lista[0].lugar})`);
    }

    case 'modificar': {
      if (!arg) return send('¿Qué evento modifico? Ejemplo: <i>modificá Biópera</i>');
      const lista = await buscarEventos(supabase, arg);
      if (lista.length === 0) return send(`No encontré eventos con "${esc(arg)}".`);
      if (lista.length > 1) return mostrarEventos(lista, `Hay ${lista.length} coincidencias. Elegí cuál modificar:`);
      return mostrarCamposEditables(lista[0]);
    }

    default:
      return send('No entendí. Probá con: <i>estado</i>, <i>pendientes</i>, <i>borra los vencidos</i>, <i>buscá …</i>, <i>aprobá …</i>, <i>borrá …</i> o <i>modificá …</i>. Escribí <i>menu</i> para ver los botones.');
  }
}

async function mostrarCamposEditables(ev) {
  const filas = [];
  const campos = Object.keys(CAMPOS_EDITABLES);
  for (let i = 0; i < campos.length; i += 2) {
    filas.push(campos.slice(i, i + 2).map(c => ({ text: CAMPOS_EDITABLES[c].label, callback_data: `campo:${ev.id}:${c}` })));
  }
  return send(`✏️ <b>${esc(ev.titulo)}</b>\n¿Qué campo cambio?`, filas);
}

// ---------- Clics en botones ----------
async function handleCallback(supabase, q) {
  if (String(q.message?.chat?.id) !== CHAT_ID) return answer(q.id, 'No autorizado', true);
  const partes = (q.data || '').split(':');
  const accion = partes[0];

  switch (accion) {
    case 'approve':
    case 'reject': {
      const nuevo = accion === 'approve' ? 'aprobado' : 'rechazado';
      const ok = await cambiarEstado(supabase, partes[1], nuevo);
      if (!ok) {
        await answer(q.id, 'Ya fue procesado o no existe.', true);
        return markMessage(q.message, '⚠️ YA PROCESADO');
      }
      await answer(q.id, `${nuevo} ✔`);
      return markMessage(q.message, `${accion === 'approve' ? '✅' : '❌'} ${nuevo.toUpperCase()}`);
    }

    case 'del': {
      await answer(q.id);
      const { data } = await supabase.from('eventos').select('id, titulo, lugar').eq('id', partes[1]).maybeSingle();
      if (!data) return send('Ese evento ya no existe.');
      return pedirConfirmacionBorrado(supabase, [data.id], `${data.titulo} (${data.lugar})`);
    }

    case 'cdel': {
      const acc = await getAccion(supabase, partes[1], 'borrar');
      if (!acc) { await answer(q.id, 'Esta confirmación ya no es válida.', true); return; }
      await cerrarAccion(supabase, acc.id, 'ejecutada'); // se cierra antes para evitar doble borrado
      const ids = acc.payload.ids;
      const { data, error } = await supabase.from('eventos').delete().in('id', ids).select('id');
      if (error) {
        await answer(q.id, 'Error al borrar', true);
        return send(`❌ Error al borrar: ${esc(error.message)}`);
      }
      await answer(q.id, `🗑 ${data.length} borrado(s).`);
      return markMessage(q.message, `🗑 ${data.length} BORRADO(S)`);
    }

    case 'cancel': {
      const acc = await getAccion(supabase, partes[1]);
      if (acc) await cerrarAccion(supabase, acc.id, 'cancelada');
      await answer(q.id, 'Cancelado.');
      return markMessage(q.message, '↩️ CANCELADO');
    }

    case 'mod': {
      await answer(q.id);
      const { data } = await supabase.from('eventos').select('id, titulo').eq('id', partes[1]).maybeSingle();
      if (!data) return send('Ese evento ya no existe.');
      return mostrarCamposEditables(data);
    }

    case 'campo': {
      const [, eventoId, campo] = partes;
      if (!CAMPOS_EDITABLES[campo]) { await answer(q.id, 'Campo no editable', true); return; }
      await answer(q.id);
      await crearAccion(supabase, 'valor', { evento_id: eventoId, campo });
      const label = CAMPOS_EDITABLES[campo].label;
      const ayuda = { hora: 'HH:MM', fecha_evento: 'AAAA-MM-DD', fecha_cierre: 'AAAA-MM-DD o null', entrada_url: 'https://… o null' }[campo] || 'el nuevo texto';
      return send(`✏️ Escribí el nuevo valor de <b>${label}</b> (${ayuda}). Para cancelar: /cancelar`);
    }

    case 'menu': {
      await answer(q.id);
      if (partes[1] === 'estado') return resumenEstado(supabase);
      if (partes[1] === 'pendientes') return listarPendientes(supabase);
      if (partes[1] === 'vencidos') return listarVencidos(supabase);
      return;
    }

    case 'done':
    default:
      return answer(q.id);
  }
}

// ---------- Loop ----------
async function main() {
  await ensureNoWebhook();
  const supabase = getSupabaseClient();

  const updates = await tg('getUpdates', { timeout: 0, allowed_updates: ['message', 'callback_query'] });
  console.log(`Updates pendientes: ${updates.length}`);
  if (updates.length === 0) return;

  for (const u of updates) {
    try {
      if (u.callback_query) await handleCallback(supabase, u.callback_query);
      else if (u.message) await handleMessage(supabase, u.message);
    } catch (err) {
      console.error(`Error en update ${u.update_id}:`, err.message);
      await send(`❌ Algo falló: ${esc(err.message)}`).catch(() => {});
    }
  }

  await tg('getUpdates', { offset: updates[updates.length - 1].update_id + 1, timeout: 0 });
  console.log('Updates confirmados.');
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
