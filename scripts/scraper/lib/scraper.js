import * as cheerio from 'cheerio';
import { parseSpanishDate, normalizeHora } from './fechas.js';

export { parseSpanishDate, normalizeHora };

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1'
};

/** Convierte un href relativo en absoluto usando la página base. Devuelve null si no se puede. */
function absUrl(href, base) {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/**
 * Scraper específico por Venue
 */
export async function scrapeVenue(config) {
  const { venue, url_agenda, metodo } = config;
  const results = [];

  const res = await fetch(url_agenda, {
    headers: COMMON_HEADERS,
    signal: AbortSignal.timeout(20000)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al acceder a ${url_agenda}`);
  }

  const rawHtml = await res.text();
  const $ = cheerio.load(rawHtml);

  // 1. JSON-LD estructurado
  if (metodo === 'json-ld') {
    $('script[type="application/ld+json"]').each((_, elem) => {
      try {
        const parsed = JSON.parse($(elem).html());
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
        for (const item of items) {
          if (item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event'))) {
            const startDate = item.startDate ? item.startDate.split('T')[0] : null;
            const endDate = item.endDate ? item.endDate.split('T')[0] : null;
            const title = item.name ? item.name.replace(/&amp;/g, '&').trim() : '';
            const link = absUrl(item.offers?.url || item.url || url_agenda, url_agenda);

            if (title && startDate) {
              results.push({
                lugar: venue,
                titulo: title,
                descripcion: item.description ? item.description.substring(0, 300) : null,
                fecha_evento: startDate,
                fecha_cierre: endDate,
                hora: item.startDate?.includes('T') ? item.startDate.split('T')[1].substring(0, 5) : null,
                fuente_url: link,
                entrada_url: absUrl(item.offers?.url, url_agenda),
                imagen_url: absUrl(item.image?.url || item.image, url_agenda),
                raw_text: rawHtml
              });
            }
          }
        }
      } catch (err) {
        // Ignorar scripts JSON no válidos
      }
    });
    return { rawHtml, events: results };
  }

  // 2. Selectores CSS Cheerio específicos por venue.
  // Nota: los campos "selectores" de venues.config.json NO se usan; las reglas viven acá.
  if (metodo === 'cheerio') {
    if (venue === 'Teatro Colón') {
      $('.calendar-item').each((_, elem) => {
        const item = $(elem);
        const title = item.find('.event-content h1').text().trim();
        const diaText = item.find('.day-number').text().trim();
        const horaText = item.find('.day-hour').text().trim();
        const ticketUrl = absUrl(item.find('.buttons a').attr('href'), url_agenda);
        const imgUrl = absUrl(item.find('figure img').attr('src'), url_agenda);
        const category = item.find('.category').text().trim();

        const date = parseSpanishDate(diaText);
        if (title && date) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: category ? `Categoría: ${category}` : null,
            fecha_evento: date,
            hora: normalizeHora(horaText),
            fuente_url: ticketUrl || url_agenda,
            entrada_url: ticketUrl,
            imagen_url: imgUrl,
            tipo_evento: category.toLowerCase().includes('ópera') ? 'opera' : (category.toLowerCase().includes('música') ? 'musica' : 'teatro'),
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'MALBA') {
      $('h2 a[href*="/evento/"], h3 a[href*="/evento/"]').each((_, elem) => {
        const link = $(elem);
        const title = link.text().replace(/__/g, ' ').replace(/\s+/g, ' ').trim();
        const fullUrl = absUrl(link.attr('href'), 'https://www.malba.org.ar');

        if (title && fullUrl) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: 'Exposición en MALBA',
            fecha_evento: '2026-01-01', // Exposiciones en curso: convención permanente/recurrente
            fuente_url: fullUrl,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Centro Cultural Recoleta') {
      $('li.box.event').each((_, elem) => {
        const item = $(elem);
        const title = item.find('h3').first().text().replace(/\s+/g, ' ').trim();
        const dateText = item.find('.date span').text().trim();
        const base = 'https://centroculturalrecoleta.org';
        const fullUrl = absUrl(item.find('a.see-more-button').attr('href'), base);
        const imgUrl = absUrl(item.find('picture img').attr('src'), base);

        const date = parseSpanishDate(dateText); // sin fecha legible: null (va a Dudosos)
        if (title && title.length > 2) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: dateText ? `Horario: ${dateText}` : null,
            fecha_evento: date,
            fuente_url: fullUrl || url_agenda,
            imagen_url: imgUrl,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Ciudad Cultural Konex') {
      $('.lista_shows .show').each((_, elem) => {
        const item = $(elem);
        const title = item.find('.nombre').text().trim();
        const info = item.find('.informacion p').text().trim();
        const link = absUrl(item.find('.show_top a').attr('href'), url_agenda) || url_agenda;
        const categoria = item.find('.categoria').text().trim();

        const date = parseSpanishDate(info);
        if (title && date) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: info ? `${categoria ? '[' + categoria + '] ' : ''}${info}` : null,
            fecha_evento: date,
            fuente_url: link,
            entrada_url: link.includes('entradas') ? link : null,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Fundación Proa') {
      $('h1, h2, h3').each((_, elem) => {
        const title = $(elem).text().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        // Los títulos de menú/navegación se descartan después por esGenerico() en el validador
        if (title.length > 5 && !title.includes('Menú') && !title.includes('Contacto')) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: 'Exposición actual en Fundación Proa',
            fecha_evento: '2026-01-01',
            fuente_url: url_agenda,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Colección Fortabat') {
      // Sin título real en la página: no se inventa uno (antes caía en "Colección Permanente", que es genérico).
      const title = $('.featured-hero-title h2').text().trim();
      if (title) {
        results.push({
          lugar: venue,
          titulo: title,
          descripcion: 'Arte argentino de los siglos XIX, XX y XXI en Colección Fortabat',
          fecha_evento: '2026-01-01',
          fuente_url: url_agenda,
          entrada_url: absUrl($('a[href*="feverup.com"]').attr('href'), url_agenda),
          raw_text: rawHtml
        });
      }
    } else if (venue === 'Museo de Arte Moderno') {
      $('h2 a[href*="/exposiciones/"], h3 a[href*="/exposiciones/"]').each((_, elem) => {
        const link = $(elem);
        const title = link.text().replace(/\s+/g, ' ').trim();
        const fullUrl = absUrl(link.attr('href'), url_agenda);
        if (title && fullUrl) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: 'Exposición en el Museo de Arte Moderno de Buenos Aires',
            fecha_evento: '2026-01-01',
            fuente_url: fullUrl,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Artlab') {
      $('a[href*="/events/"]').each((_, elem) => {
        const item = $(elem);
        const text = item.text().replace(/\s+/g, ' ').trim();
        const fullUrl = absUrl(item.attr('href'), 'https://tickets.artlabpro.net');
        if (!fullUrl) return;

        // Extraer precio si existe
        const precioMatch = text.match(/Desde AR\$\s*[\d\.]+/i);
        const date = parseSpanishDate(text);

        // Limpiar título
        const parts = text.split('ARTLAB');
        let titleCandidate = parts.length > 1 ? parts[1] : text;
        titleCandidate = titleCandidate.replace(/\d{1,2}\s+[A-Z]{3}.*/, '').trim();

        if (titleCandidate.length > 3 && date) {
          results.push({
            lugar: venue,
            titulo: titleCandidate,
            descripcion: 'Evento en vivo en Artlab',
            fecha_evento: date,
            precio: precioMatch ? precioMatch[0] : null,
            fuente_url: fullUrl,
            entrada_url: fullUrl,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Museo Nacional de Bellas Artes') {
      const genericWords = ['anterior', 'siguiente', 'português', 'english', 'museo abierto', 'inicio', 'volver'];
      $('a[href*="/agenda/"]').each((_, elem) => {
        const item = $(elem);
        const title = item.text().replace(/\s+/g, ' ').trim();
        const href = item.attr('href') || '';
        const lower = title.toLowerCase();

        if (
          title &&
          title.length > 5 &&
          !genericWords.some(w => lower === w || lower.startsWith(w)) &&
          !href.includes('/lang/') &&
          href !== '/agenda/' &&
          href !== '/agenda'
        ) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: 'Actividad en Museo Nacional de Bellas Artes',
            fecha_evento: '2026-01-01',
            fuente_url: absUrl(href, 'https://www.bellasartes.gob.ar'),
            raw_text: rawHtml
          });
        }
      });
    } else {
      // Antes este caso devolvía 0 eventos sin avisar.
      console.warn(`⚠️ [SCRAPER] ${venue}: no hay rama de scraping para este venue en scraper.js. Revisar.`);
    }

    return { rawHtml, events: results };
  }

  return { rawHtml, events: [] };
}
