/**
 * Módulo de Notificaciones y Aprobación en Telegram.
 * Todo texto que viene de la base o de las fuentes se escapa antes de enviarse como HTML.
 */

const TIMEOUT_MS = 15000;

/** Escapa para parse_mode HTML de Telegram (texto y atributos). */
export function escHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeToken(token) {
  if (!token) return '';
  let clean = String(token).trim().replace(/^["']|["']$/g, '');
  if (clean.toLowerCase().startsWith('bot')) {
    clean = clean.slice(3).trim();
  }
  return clean;
}

function sanitizeChatId(chatId) {
  if (!chatId) return '';
  return String(chatId).trim().replace(/^["']|["']$/g, '');
}

export async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  const cleanToken = sanitizeToken(botToken);
  const cleanChatId = sanitizeChatId(chatId);

  if (!cleanToken || !cleanChatId) {
    console.log("[Telegram] Bot token o chat ID no configurado. Mensaje simulado:\n" + text);
    return null;
  }

  if (!cleanToken.includes(':')) {
    console.error(`[Telegram Error] El TELEGRAM_BOT_TOKEN no parece válido (debe tener el formato 123456789:AAHk... con dos puntos). Se recibió: "${cleanToken.substring(0, 6)}..."`);
    return null;
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  const body = {
    chat_id: cleanChatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra
  };

  // Un reintento si Telegram pide esperar (429). Sin timeout, un envío colgado frena toda la corrida.
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      const data = await res.json();

      if (res.status === 429 && intento === 1) {
        const espera = (data.parameters?.retry_after || 1) * 1000;
        console.warn(`[Telegram] Rate limit, reintento en ${espera} ms`);
        await new Promise((r) => setTimeout(r, espera));
        continue;
      }

      if (!res.ok || !data.ok) {
        if (data.error_code === 404) {
          console.error(`[Telegram Error 404] "Not Found" devuelto por la API de Telegram.`);
          console.error(`Esto significa estrictamente que el TELEGRAM_BOT_TOKEN es incorrecto o no existe en Telegram.`);
          console.error(`Verifica que en GitHub Secrets TELEGRAM_BOT_TOKEN sea exactamente el token provisto por @BotFather (ejemplo: 7123456789:AAHkF_...).`);
        } else {
          console.error("[Telegram Error]", JSON.stringify(data), `ChatID: ${cleanChatId}`);
        }
      } else {
        console.log(`[Telegram] Mensaje enviado con éxito al chat ${cleanChatId}`);
      }
      return data;
    } catch (err) {
      console.error("[Telegram Network Error]", err.message);
      return null;
    }
  }
  return null;
}

const fechaLegible = (f) => (f === '2026-01-01' ? 'Permanente / recurrente' : escHtml(f));

/**
 * Envía el reporte diario resumido
 */
export async function sendDailyReport(botToken, chatId, report) {
  const {
    isDryRun,
    toInsert = [],
    toUpdate = [],
    toDelete = [],
    deleteBlockedByCircuitBreaker,
    dudosos = [],
    failedVenues = [],
    totalActivos = 0
  } = report;

  const titlePrefix = isDryRun ? "🔍 [DRY-RUN] " : "🚀 ";
  let msg = `<b>${titlePrefix}Radar Cultural — Reporte de Scraping Diario</b>\n\n`;

  msg += `📊 <b>Total eventos activos:</b> ${totalActivos}\n`;
  msg += `✨ <b>Nuevos pendientes:</b> ${toInsert.length}\n`;
  msg += `🔄 <b>Modificados:</b> ${toUpdate.length}\n`;
  msg += `🗑️ <b>Eliminados:</b> ${toDelete.length}\n`;
  msg += `⚠️ <b>Dudosos / Rechazados:</b> ${dudosos.length}\n`;
  msg += `❌ <b>Venues con error:</b> ${failedVenues.length}\n\n`;

  // Circuit breaker alert
  if (deleteBlockedByCircuitBreaker) {
    msg += `🚨 <b>ALERTA DE SEGURIDAD (CIRCUIT BREAKER):</b>\n`;
    msg += `Se detectaron ${toDelete.length} eventos para eliminar (supera el límite de 20).\n`;
    msg += `<b>NO SE ELIMINÓ NINGUNO.</b> Confirmalo con los botones que llegan aparte. Si no llegaron, escribí <i>borra los vencidos</i> en el bot.\n\n`;
  }

  // Venues fallidos
  if (failedVenues.length > 0) {
    msg += `<b>Venues con error:</b>\n`;
    for (const v of failedVenues) {
      msg += `• <b>${escHtml(v.venue)}</b>: ${escHtml(v.error)}\n`;
    }
    msg += `\n`;
  }

  // Modificados
  if (toUpdate.length > 0) {
    msg += `<b>Eventos Modificados:</b>\n`;
    for (const u of toUpdate.slice(0, 5)) {
      msg += `• <b>${escHtml(u.titulo)}</b> (${escHtml(u.lugar)})\n`;
    }
    if (toUpdate.length > 5) msg += `<i>... y ${toUpdate.length - 5} más</i>\n`;
    msg += `\n`;
  }

  // Dudosos / Rechazados
  if (dudosos.length > 0) {
    msg += `<b>Eventos Dudosos (No cargados):</b>\n`;
    for (const d of dudosos.slice(0, 5)) {
      msg += `• <b>${escHtml(d.titulo || 'Sin título')}</b> (${escHtml(d.lugar)}): ${d.reasons.map(escHtml).join(', ')}\n`;
    }
    if (dudosos.length > 5) msg += `<i>... y ${dudosos.length - 5} más</i>\n`;
    msg += `\n`;
  }

  // Enviar mensaje principal
  await sendTelegramMessage(botToken, chatId, msg);

  // Tarjetas de aprobación para eventos pendientes.
  // Para no pasar el rate limit de Telegram (30 msgs/seg) limitamos la cantidad y hacemos una pausa entre envíos.
  const maxCards = isDryRun ? 3 : 15;
  const cardsToSend = toInsert.slice(0, maxCards);

  if (cardsToSend.length > 0) {
    for (const ev of cardsToSend) {
      const fuente = ev.fuente_url
        ? `<a href="${escHtml(ev.fuente_url)}">${escHtml(ev.fuente_url)}</a>`
        : 'sin fuente';

      const evText = `📌 <b>Evento Pendiente:</b>\n` +
        `<b>Título:</b> ${escHtml(ev.titulo)}\n` +
        `<b>Lugar:</b> ${escHtml(ev.lugar)}\n` +
        `<b>Fecha:</b> ${fechaLegible(ev.fecha_evento)}${ev.hora ? ' - ' + escHtml(ev.hora) : ''}\n` +
        `<b>Fuente:</b> ${fuente}`;

      // Sin id (dry-run) no hay evento que aprobar: la tarjeta se envía sin botones
      const keyboard = ev.id ? {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Aprobar", callback_data: `approve:${ev.id}` },
              { text: "❌ Rechazar", callback_data: `reject:${ev.id}` }
            ]
          ]
        }
      } : {};

      await sendTelegramMessage(botToken, chatId, evText, keyboard);
      await new Promise((r) => setTimeout(r, 200));
    }

    if (toInsert.length > maxCards) {
      await sendTelegramMessage(botToken, chatId, `<i>ℹ️ Hay ${toInsert.length - maxCards} eventos pendientes más en la cartelera.</i>`);
    }
  }
}
