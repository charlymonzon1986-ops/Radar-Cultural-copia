/**
 * Módulo de Notificaciones y Aprobación en Telegram
 */

export async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  if (!botToken || !chatId) {
    console.log("[Telegram] Bot token o chat ID no configurado. Mensaje simulado:\n" + text);
    return null;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[Telegram Error]", data);
    }
    return data;
  } catch (err) {
    console.error("[Telegram Network Error]", err.message);
    return null;
  }
}

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
    msg += `<b>NO SE ELIMINÓ NINGUNO.</b> Requiere confirmación manual.\n\n`;
  }

  // Venues fallidos
  if (failedVenues.length > 0) {
    msg += `<b>Venues con error:</b>\n`;
    for (const v of failedVenues) {
      msg += `• <b>${v.venue}</b>: ${v.error}\n`;
    }
    msg += `\n`;
  }

  // Modificados
  if (toUpdate.length > 0) {
    msg += `<b>Eventos Modificados:</b>\n`;
    for (const u of toUpdate.slice(0, 5)) {
      msg += `• <b>${u.titulo}</b> (${u.lugar})\n`;
    }
    if (toUpdate.length > 5) msg += `<i>... y ${toUpdate.length - 5} más</i>\n`;
    msg += `\n`;
  }

  // Dudosos / Rechazados
  if (dudosos.length > 0) {
    msg += `<b>Eventos Dudosos (No cargados):</b>\n`;
    for (const d of dudosos.slice(0, 5)) {
      msg += `• <b>${d.titulo || 'Sin título'}</b> (${d.lugar}): ${d.reasons.join(', ')}\n`;
    }
    if (dudosos.length > 5) msg += `<i>... y ${dudosos.length - 5} más</i>\n`;
    msg += `\n`;
  }

  // Enviar mensaje principal
  await sendTelegramMessage(botToken, chatId, msg);

  // Enviar botones interactivos de Aprobación por cada evento nuevo pendiente
  if (toInsert.length > 0) {
    for (const ev of toInsert) {
      const evText = `📌 <b>Evento Pendiente:</b>\n` +
        `<b>Título:</b> ${ev.titulo}\n` +
        `<b>Lugar:</b> ${ev.lugar}\n` +
        `<b>Fecha:</b> ${ev.fecha_evento}${ev.hora ? ' - ' + ev.hora : ''}\n` +
        `<b>Fuente:</b> <a href="${ev.fuente_url}">${ev.fuente_url}</a>`;

      // Los botones llevan callback_data con un identificador (o URL de aprobación)
      // En dry-run los botones aclaran que es simulación
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Aprobar", callback_data: `approve:${ev.titulo.substring(0, 25)}` },
              { text: "❌ Rechazar", callback_data: `reject:${ev.titulo.substring(0, 25)}` }
            ]
          ]
        }
      };

      await sendTelegramMessage(botToken, chatId, evText, keyboard);
    }
  }
}
