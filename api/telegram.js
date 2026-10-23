/**
 * Webhook del bot de Telegram (Vercel Function).
 * Telegram llama acá en cada mensaje o toque de botón, así la respuesta es inmediata.
 */
import { procesarUpdate, send } from '../scripts/scraper/lib/bot-core.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Solo acepta llamadas que traigan el secreto configurado en setWebhook
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secreto || req.headers['x-telegram-bot-api-secret-token'] !== secreto) {
    return res.status(401).end();
  }

  try {
    await procesarUpdate(req.body);
  } catch (err) {
    console.error('Error procesando update:', err);
    await send(`❌ Algo falló: ${String(err.message || err).slice(0, 300)}`).catch(() => {});
  }

  // Siempre 200 para que Telegram no reintente el mismo update
  return res.status(200).json({ ok: true });
}
