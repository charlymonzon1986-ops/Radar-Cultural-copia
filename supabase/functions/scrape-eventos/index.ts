import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KEYWORDS = [
  'charla gratuita', 'gratis', 'inauguración', 'exposición', 'exposicion',
  'muestra', 'apertura', 'presentación', 'presentacion', 'vernissage',
  'visita guiada', 'taller', 'workshop', 'concierto', 'recital',
  'lectura', 'firma de libros', 'ciclo', 'festival', 'jornada',
  'entrada libre', 'gratuito', 'opening', 'show', 'performance'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { data: fuentes, error: fuentesError } = await supabase
      .from('fuentes_eventos')
      .select('*')
      .eq('activa', true);

    if (fuentesError) throw fuentesError;
    if (!fuentes || fuentes.length === 0) {
      return new Response(JSON.stringify({ message: 'No active sources to scrape', events: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalEvents = 0;

    for (const fuente of fuentes) {
      try {
        console.log(`Scraping: ${fuente.url} for ${fuente.lugar}`);
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: fuente.url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeRes.json();
        if (!scrapeRes.ok) {
          console.error(`Firecrawl error for ${fuente.url}:`, scrapeData);
          continue;
        }

        const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
        if (!markdown) {
          console.log(`No content found for ${fuente.url}`);
          continue;
        }

        // Check if content contains any relevant keywords
        const lowerContent = markdown.toLowerCase();
        const hasKeywords = KEYWORDS.some(kw => lowerContent.includes(kw));
        
        if (!hasKeywords) {
          console.log(`No relevant keywords found for ${fuente.lugar}, skipping AI extraction`);
          continue;
        }

        const keywordsStr = KEYWORDS.join(', ');

        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `Sos un asistente que extrae eventos culturales de textos web/Instagram. Buscá SOLO contenido que contenga estas palabras clave: ${keywordsStr}. Extraé eventos futuros o próximos (inauguraciones, charlas, presentaciones, shows, exposiciones, muestras). Respondé ÚNICAMENTE con un JSON array. Cada objeto debe tener:
- "titulo" (string, título del evento)
- "descripcion" (string breve, resumen de 1-2 oraciones)
- "fecha_evento" (string, formato "YYYY-MM-DD" si está disponible, sino "Por confirmar")
- "hora" (string, ej "19:00", sino "")
- "instagram_url" (string, URL del post de Instagram si está disponible, sino "")
- "imagen_url" (string, URL de imagen del evento si está disponible, sino "")
Si no hay eventos relevantes, respondé con un array vacío []. NO incluyas texto adicional fuera del JSON.`
              },
              {
                role: 'user',
                content: `Extraé los eventos culturales de este contenido del lugar "${fuente.lugar}" (fuente: ${fuente.url}):\n\n${markdown.substring(0, 8000)}`
              }
            ],
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error(`AI error for ${fuente.lugar}:`, aiRes.status, errText);
          continue;
        }

        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || '[]';

        let events: any[] = [];
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            events = JSON.parse(jsonMatch[0]);
          }
        } catch (parseErr) {
          console.error(`Failed to parse AI response for ${fuente.lugar}:`, content);
          continue;
        }

        for (const evt of events) {
          if (!evt.titulo) continue;
          const { error: insertError } = await supabase.from('eventos').insert({
            lugar: fuente.lugar,
            titulo: evt.titulo,
            descripcion: evt.descripcion || '',
            fecha_evento: evt.fecha_evento || 'Por confirmar',
            hora: evt.hora || '',
            fuente_url: fuente.url,
            estado: 'pendiente',
            instagram_url: evt.instagram_url || fuente.url,
            imagen_url: evt.imagen_url || '',
          });
          if (!insertError) totalEvents++;
          else console.error('Insert error:', insertError);
        }

        console.log(`Found ${events.length} events for ${fuente.lugar}`);
      } catch (sourceErr) {
        console.error(`Error processing source ${fuente.url}:`, sourceErr);
      }
    }

    return new Response(JSON.stringify({ success: true, events: totalEvents }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in scrape-eventos:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
