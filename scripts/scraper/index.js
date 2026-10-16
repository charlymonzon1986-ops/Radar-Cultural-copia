import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { scrapeVenue } from './lib/scraper.js';
import { validateEvent } from './lib/validator.js';
import { getSupabaseClient, getVenuesSet, syncEventsWithSupabase } from './lib/database.js';
import { sendDailyReport } from './lib/telegram.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`\n==================================================`);
  console.log(`📡 Radar Cultural Scraper [Modo: ${isDryRun ? 'DRY-RUN (Sin escrituras)' : 'PRODUCCIÓN'}]`);
  console.log(`==================================================\n`);

  // 1. Cargar venues.config.json
  const configPath = path.join(__dirname, 'venues.config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`Error: No se encontró el archivo de configuración en ${configPath}`);
    process.exit(1);
  }

  const venuesConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log(`📋 Se cargaron ${venuesConfig.length} venues para procesar.`);

  // 2. Conectar a Supabase y obtener lista de lugares válidos
  let supabase = null;
  let validVenuesSet = new Set();
  try {
    supabase = getSupabaseClient();
    validVenuesSet = await getVenuesSet(supabase);
    console.log(`🏛️ Supabase conectado: ${validVenuesSet.size} venues verificados en la tabla 'lugares'.\n`);
  } catch (err) {
    if (isDryRun) {
      console.warn(`⚠️ [DRY-RUN] No se pudo conectar a Supabase (${err.message}). Usando lista de venues del config.`);
      validVenuesSet = new Set(venuesConfig.map(v => v.venue));
    } else {
      console.error(`❌ Error fatal conectando a Supabase:`, err.message);
      process.exit(1);
    }
  }

  // 3. Ejecutar scraping por venue
  const allExtractedEvents = [];
  const failedVenues = [];
  const unknownVenues = [];

  for (const config of venuesConfig) {
    if (config.metodo === 'manual') {
      console.log(`⏩ [MANUAL] ${config.venue}: Marcado como manual, omitiendo.`);
      continue;
    }

    if (!validVenuesSet.has(config.venue)) {
      console.warn(`⚠️ [DESCONOCIDO] ${config.venue} no figura en la tabla 'lugares'. Omitiendo.`);
      unknownVenues.push(config.venue);
      continue;
    }

    console.log(`⏳ Scrapeando [${config.metodo.toUpperCase()}]: ${config.venue} (${config.url_agenda})...`);
    try {
      const { rawHtml, events } = await scrapeVenue(config);
      console.log(`   ✓ Extraídos ${events.length} eventos candidatos.`);
      for (const ev of events) {
        allExtractedEvents.push({ ev, rawHtml });
      }
    } catch (err) {
      console.error(`   ✗ Error al procesar ${config.venue}: ${err.message}`);
      failedVenues.push({ venue: config.venue, error: err.message });
    }
  }

  console.log(`\n🔍 Validando ${allExtractedEvents.length} eventos extraídos contra reglas estrictas...`);

  // 4. Validar eventos extraídos
  const validEvents = [];
  const dudosos = [];

  for (const { ev, rawHtml } of allExtractedEvents) {
    const valResult = await validateEvent(ev, rawHtml, validVenuesSet);
    if (valResult.isValid) {
      validEvents.push(ev);
    } else {
      dudosos.push({
        titulo: ev.titulo,
        lugar: ev.lugar,
        reasons: valResult.reasons
      });
    }
  }

  console.log(`✅ Eventos que superaron la validación: ${validEvents.length}`);
  console.log(`⚠️ Eventos dudosos / descartados: ${dudosos.length}`);

  // 5. Sincronización con Supabase (Diff)
  let syncResult = {
    toInsert: validEvents,
    toUpdate: [],
    toDelete: [],
    deleteBlockedByCircuitBreaker: false,
    totalActivos: validEvents.length
  };

  if (supabase) {
    try {
      syncResult = await syncEventsWithSupabase(supabase, validEvents, { isDryRun });
    } catch (syncErr) {
      console.error("❌ Error durante la sincronización con Supabase:", syncErr.message);
    }
  }

  console.log(`\n📊 Resumen de sincronización:`);
  console.log(`   - Nuevos a insertar (estado='pendiente'): ${syncResult.toInsert.length}`);
  console.log(`   - Modificados a actualizar: ${syncResult.toUpdate.length}`);
  console.log(`   - Eliminados por vencimiento: ${syncResult.toDelete.length}`);
  if (syncResult.deleteBlockedByCircuitBreaker) {
    console.log(`   🚨 CIRCUIT BREAKER ACTIVADO: Más de 20 eventos para eliminar. Borrado cancelado.`);
  }

  // 6. Enviar reporte por Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const report = {
    isDryRun,
    toInsert: syncResult.toInsert,
    toUpdate: syncResult.toUpdate,
    toDelete: syncResult.toDelete,
    deleteBlockedByCircuitBreaker: syncResult.deleteBlockedByCircuitBreaker,
    dudosos,
    failedVenues,
    totalActivos: syncResult.totalActivos
  };

  await sendDailyReport(botToken, chatId, report);

  console.log(`\n🎉 Corrida finalizada con éxito.`);
}

run().catch(err => {
  console.error("Error fatal no controlado:", err);
  process.exit(1);
});
