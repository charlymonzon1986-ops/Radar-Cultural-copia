import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Solo se aceptan fotos del storage público de este proyecto.
const ALLOWED_PHOTO_PREFIX = 'https://boeurmldeqvcaikdhtvy.supabase.co/storage/v1/object/public/';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .slice(0, 300);

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not configured' }, 500);

  try {
    const { lugar, autor, instagram, photoUrl } = await req.json();

    if (typeof photoUrl !== 'string' || !photoUrl.startsWith(ALLOWED_PHOTO_PREFIX)) {
      return json({ error: 'photoUrl no permitida' }, 400);
    }
    if (typeof lugar !== 'string' || lugar.length === 0 || lugar.length > 200) {
      return json({ error: 'lugar inválido' }, 400);
    }

    const instagramLine = instagram
      ? `<p><strong>Instagram:</strong> @${esc(String(instagram).replace('@', ''))}</p>`
      : '';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">📸 Nueva foto subida al Radar Cultural</h2>
        <hr style="border: 1px solid #eee;" />
        <p><strong>Lugar:</strong> ${esc(lugar)}</p>
        <p><strong>Subida por:</strong> ${esc(autor || 'Anónimo')}</p>
        ${instagramLine}
        <p><strong>Ver foto:</strong> <a href="${esc(photoUrl)}">${esc(photoUrl)}</a></p>
        <br/>
        <img src="${esc(photoUrl)}" style="max-width: 100%; border-radius: 8px;" />
        <hr style="border: 1px solid #eee;" />
        <p style="color: #888; font-size: 12px;">Radar Cultural de Buenos Aires</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Radar Cultural <onboarding@resend.dev>',
        to: ['juanomonzon@gmail.com'],
        subject: `📸 Nueva foto en ${esc(lugar)} - por ${esc(autor || 'Anónimo')}`,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);

    return json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: msg }, 500);
  }
});
