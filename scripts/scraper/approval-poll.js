/**
 * Procesa los clics de Aprobar/Rechazar pendientes de Telegram y termina.
 * Pensado para correr cada pocos minutos desde GitHub Actions (no es un proceso permanente).
 */
import dotenv from 'dotenv';
import { getSupabaseClient } from './lib/database.js';

dotenv.config();

const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN no configurado.');
  process.exit(1);
}

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

// getUpdates no funciona si hay un webhook activo
async function ensureNoWebhook() {
  const info = await tg('getWebhookInfo');
  if (info.url) {
    console.log(`Webhook activo (${info.url}). Se elimina para poder usar getUpdates.`);
    await tg('deleteWebhook');
  }
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
  }).catch(err => console.error('No se pudo actualizar el mensaje:', err.message));
}

async function handleCallback(supabase, query) {
  const [action, id] = (query.data || '').split(':');

  // Botón "done" (ya procesado) u otra acción sin id
  if (!['approve', 'reject'].includes(action) || !id) {
    return answer(query.id);
  }

  const nuevoEstado = action === 'approve' ? 'aprobado' : 'rechazado';
  const icon = action === 'approve' ? '✅' : '❌';

  const { data, error } = await supabase
    .from('eventos')
    .update({ estado: nuevoEstado })
    .eq('id', id)
    .eq('estado', 'pendiente')
    .select('id');

  if (error) {
    await answer(query.id, `Error: ${error.message}`, true);
    return;
  }

  if (!data || data.length === 0) {
    await answer(query.id, 'Este evento ya fue procesado o ya no existe.', true);
    await markMessage(query.message, '⚠️ YA PROCESADO');
    return;
  }

  console.log(`${nuevoEstado}: evento ${id}`);
  await answer(query.id, `${icon} Evento ${nuevoEstado} correctamente.`);
  await markMessage(query.message, `${icon} ${nuevoEstado.toUpperCase()}`);
}

async function main() {
  await ensureNoWebhook();
  const supabase = getSupabaseClient();

  const updates = await tg('getUpdates', { timeout: 0, allowed_updates: ['callback_query'] });
  console.log(`Updates pendientes: ${updates.length}`);
  if (updates.length === 0) return;

  for (const update of updates) {
    if (!update.callback_query) continue;
    try {
      await handleCallback(supabase, update.callback_query);
    } catch (err) {
      console.error(`Error en update ${update.update_id}:`, err.message);
    }
  }

  // Confirmar todos los updates leídos para que no se vuelvan a procesar
  const lastId = updates[updates.length - 1].update_id;
  await tg('getUpdates', { offset: lastId + 1, timeout: 0 });
  console.log('Updates confirmados.');
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
