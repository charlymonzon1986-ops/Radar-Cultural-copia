import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { lugar, autor, instagram, photoUrl } = await req.json();

    // Fetch the photo to attach it
    let attachments: { filename: string; content: string }[] = [];
    try {
      const photoResponse = await fetch(photoUrl);
      if (photoResponse.ok) {
        const arrayBuffer = await photoResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        // Convert to base64
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        attachments = [{ filename: `foto_${lugar}.${ext}`, content: base64 }];
      } else {
        await photoResponse.text();
      }
    } catch (e) {
      console.error('Could not fetch photo for attachment:', e);
    }

    const instagramLine = instagram ? `<p><strong>Instagram:</strong> @${instagram.replace('@', '')}</p>` : '';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">📸 Nueva foto subida al Radar Cultural</h2>
        <hr style="border: 1px solid #eee;" />
        <p><strong>Lugar:</strong> ${lugar}</p>
        <p><strong>Subida por:</strong> ${autor || 'Anónimo'}</p>
        ${instagramLine}
        <p><strong>URL de la foto:</strong> <a href="${photoUrl}">${photoUrl}</a></p>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #888; font-size: 12px;">Radar Cultural de Buenos Aires</p>
      </div>
    `;

    const emailPayload: Record<string, unknown> = {
      from: 'Radar Cultural <onboarding@resend.dev>',
      to: ['juanomonzon@gmail.com'],
      subject: `📸 Nueva foto en ${lugar} - por ${autor || 'Anónimo'}`,
      html: htmlBody,
    };

    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending notification email:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
