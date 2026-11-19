/**
 * Constantes compartidas del scraper.
 *
 * FECHA_PERMANENTE: fecha centinela para exposiciones o colecciones sin fecha de cierre
 * (permanentes o de duración indefinida). Un evento con esta fecha no vence por fecha
 * y no se marca como "próximo". Antes estaba escrita a mano en validator, database, gcba y scraper:
 * si se cambia, debe cambiarse solo acá.
 */
export const FECHA_PERMANENTE = '2026-01-01';
