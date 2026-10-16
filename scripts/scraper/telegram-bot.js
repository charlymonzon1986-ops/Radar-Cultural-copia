import dotenv from 'dotenv';
import { getSupabaseClient } from './lib/database.js';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN no configurado.");
  process.exit(1);
}

const supabase = getSupabaseClient();
console.log("🤖 Iniciando escuchador de aprobaciones de Telegram (Long Polling)...");

let offset = 0;

async function pollUpdates() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=20`);
    if (!res.ok) return;

    const data = await res.json();
    if (!data.ok || !data.result) return;

    for (const update of data.result) {
      offset = update.update_id + 1;

      if (update.callback_query) {
        const query = update.callback_query;
        const callbackData = query.data; // ej: approve:titulo... o reject:titulo...
        const message = query.message;

        const [action, ...titleParts] = callbackData.split(':');
        const titleSnippet = titleParts.join(':');

        console.log(`Acción recibida: ${action} para "${titleSnippet}"`);

        const newEstado = action === 'approve' ? 'aprobado' : 'rechazado';
        const icon = action === 'approve' ? '✅' : '❌';

        // Actualizar en Supabase
        const { error } = await supabase
          .from('eventos')
          .update({ estado: newEstado })
          .ilike('titulo', `%${titleSnippet}%`)
          .eq('estado', 'pendiente');

        if (error) {
          console.error("Error actualizando evento en Supabase:", error);
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: query.id,
              text: `Error al actualizar: ${error.message}`,
              show_alert: true
            })
          });
        } else {
          // Responder callback y actualizar el mensaje en el chat
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: query.id,
              text: `${icon} Evento ${newEstado} correctamente.`
            })
          });

          await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: message.chat.id,
              message_id: message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [{ text: `${icon} ${newEstado.toUpperCase()}`, callback_data: 'done' }]
                ]
              }
            })
          });
        }
      }
    }
  } catch (err) {
    console.error("Error en polling de Telegram:", err.message);
  }
}

async function loop() {
  while (true) {
    await pollUpdates();
    await new Promise(r => setTimeout(r, 1000));
  }
}

loop();
