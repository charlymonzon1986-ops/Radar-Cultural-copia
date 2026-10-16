import * as cheerio from 'cheerio';

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

const MESES = {
  'ene': '01', 'enero': '01',
  'feb': '02', 'febrero': '02',
  'mar': '03', 'marzo': '03',
  'abr': '04', 'abril': '04',
  'may': '05', 'mayo': '05',
  'jun': '06', 'junio': '06',
  'jul': '07', 'julio': '07',
  'ago': '08', 'agosto': '08',
  'sep': '09', 'septiembre': '09', 'setiembre': '09',
  'oct': '10', 'octubre': '10',
  'nov': '11', 'noviembre': '11',
  'dic': '12', 'diciembre': '12'
};

/**
 * Normaliza fechas en español a YYYY-MM-DD
 */
export function parseSpanishDate(text, defaultYear = 2026) {
  if (!text) return null;
  const clean = text.toLowerCase().trim();

  // YYYY-MM-DD
  const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    return `${dmyMatch[3]}-${m}-${d}`;
  }

  // DD de [mes] de YYYY o DD de [mes]
  for (const [mesNombre, mesNum] of Object.entries(MESES)) {
    const regex = new RegExp(`(\\d{1,2})\\s*(?:de)?\\s*${mesNombre}(?:\\s*(?:de)?\\s*(\\d{4}))?`, 'i');
    const match = clean.match(regex);
    if (match) {
      const day = match[1].padStart(2, '0');
      const year = match[2] || defaultYear;
      return `${year}-${mesNum}-${day}`;
    }
  }

  // Si es un día del mes actual (ej: "16." o "16")
  const simpleDayMatch = clean.match(/^(\d{1,2})\.?$/);
  if (simpleDayMatch) {
    const now = new Date();
    const day = simpleDayMatch[1].padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Scraper específico por Venue
 */
export async function scrapeVenue(config) {
  const { venue, url_agenda, metodo, selectores } = config;
  const results = [];

  const res = await fetch(url_agenda, {
    headers: COMMON_HEADERS
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
            const link = item.offers?.url || item.url || url_agenda;

            if (title && startDate) {
              results.push({
                lugar: venue,
                titulo: title,
                descripcion: item.description ? item.description.substring(0, 300) : null,
                fecha_evento: startDate,
                fecha_cierre: endDate,
                hora: item.startDate?.includes('T') ? item.startDate.split('T')[1].substring(0, 5) : null,
                fuente_url: link,
                entrada_url: item.offers?.url || null,
                imagen_url: item.image?.url || item.image || null,
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

  // 2. Selectores CSS Cheerio específicos
  if (metodo === 'cheerio') {
    if (venue === 'Teatro Colón') {
      $('.calendar-item').each((_, elem) => {
        const item = $(elem);
        const title = item.find('.event-content h1').text().trim();
        const diaText = item.find('.day-number').text().trim();
        const horaText = item.find('.day-hour').text().trim();
        const ticketUrl = item.find('.buttons a').attr('href') || null;
        const imgUrl = item.find('figure img').attr('src') || null;
        const category = item.find('.category').text().trim();

        const date = parseSpanishDate(diaText);
        if (title && date) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: category ? `Categoría: ${category}` : null,
            fecha_evento: date,
            hora: horaText || null,
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
        const href = link.attr('href');
        const fullUrl = href.startsWith('http') ? href : `https://www.malba.org.ar${href}`;

        if (title && fullUrl) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: 'Exposición en MALBA',
            fecha_evento: '2026-01-01', // Exposiciones en curso convención permanente/recurrente
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
        const linkHref = item.find('a.see-more-button').attr('href') || '';
        const fullUrl = linkHref.startsWith('http') ? linkHref : `http://centroculturalrecoleta.org${linkHref}`;
        const imgUrl = item.find('picture img').attr('src') || null;

        const date = parseSpanishDate(dateText) || '2026-01-01';
        if (title && title.length > 2) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: dateText ? `Horario: ${dateText}` : null,
            fecha_evento: date,
            fuente_url: fullUrl || url_agenda,
            imagen_url: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `http://centroculturalrecoleta.org${imgUrl}`) : null,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Ciudad Cultural Konex') {
      $('.lista_shows .show').each((_, elem) => {
        const item = $(elem);
        const title = item.find('.nombre').text().trim();
        const info = item.find('.informacion p').text().trim();
        const link = item.find('.show_top a').attr('href') || url_agenda;
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
      const title = $('.featured-hero-title h2').text().trim() || 'Colección Permanente';
      const ticketsUrl = $('a[href*="feverup.com"]').attr('href') || null;
      results.push({
        lugar: venue,
        titulo: title,
        descripcion: 'Arte argentino de los siglos XIX, XX y XXI en Colección Fortabat',
        fecha_evento: '2026-01-01',
        fuente_url: url_agenda,
        entrada_url: ticketsUrl,
        raw_text: rawHtml
      });
    } else if (venue === 'Museo de Arte Moderno') {
      $('h2 a[href*="/exposiciones/"], h3 a[href*="/exposiciones/"]').each((_, elem) => {
        const link = $(elem);
        const title = link.text().replace(/\s+/g, ' ').trim();
        const href = link.attr('href');
        if (title && href) {
          results.push({
            lugar: venue,
            titulo: title,
            descripcion: 'Exposición en el Museo de Arte Moderno de Buenos Aires',
            fecha_evento: '2026-01-01',
            fuente_url: href,
            raw_text: rawHtml
          });
        }
      });
    } else if (venue === 'Artlab') {
      $('a[href*="/events/"]').each((_, elem) => {
        const item = $(elem);
        const text = item.text().replace(/\s+/g, ' ').trim();
        const href = item.attr('href');
        const fullUrl = href.startsWith('http') ? href : `https://tickets.artlabpro.net${href}`;

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
            fuente_url: href.startsWith('http') ? href : `https://www.bellasartes.gob.ar${href}`,
            raw_text: rawHtml
          });
        }
      });
    }

    return { rawHtml, events: results };
  }

  return { rawHtml, events: [] };
}
