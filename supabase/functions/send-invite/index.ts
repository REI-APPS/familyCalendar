// Supabase Edge Function: send-invite
// Runtime: Deno (https://deno.com)
//
// Deploy:
//   supabase functions deploy send-invite --no-verify-jwt=false
// Set secret:
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set INVITE_FROM=convites@familycalendar.grouprei.com
//   supabase secrets set PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.grouprei.familyCalendar
//
// Client call:
//   const { data, error } = await supabase.functions.invoke('send-invite', {
//     body: { to, familyName, inviterEmail }
//   });

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const RESEND_API = 'https://api.resend.com/emails';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildHtml(opts: { to: string; familyName: string; inviterEmail?: string; playStoreUrl: string }) {
  return `<!doctype html><html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#FDFDF9;padding:24px;color:#2D3142;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E8E5DC;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#FF8FA3;">Foste convidado(a)! 🏡</h1>
      <p style="font-size:15px;line-height:22px;">${opts.inviterEmail ? `<b>${opts.inviterEmail}</b>` : 'Alguém'} convidou-te para fazer parte da família <b>"${opts.familyName}"</b> na <b>Agenda da Família</b>.</p>
      <p style="font-size:15px;line-height:22px;margin-top:18px;"><b>Como aceitar:</b></p>
      <ol style="font-size:14px;line-height:24px;color:#7D8299;">
        <li>Instala a app <b>Agenda da Família</b></li>
        <li>Cria conta usando <b>este mesmo email</b>: <span style="color:#2D3142;font-weight:700;">${opts.to}</span></li>
        <li>Ao entrar pela primeira vez ficas <b>automaticamente</b> associado(a) à família <b>${opts.familyName}</b>.</li>
      </ol>
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${opts.playStoreUrl}" style="display:inline-block;background:#FF8FA3;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px;">Instalar Agenda da Família</a>
      </div>
      <p style="font-size:11px;color:#9CA0A8;text-align:center;margin-top:18px;">Importante: o email da conta tem de coincidir com <b>${opts.to}</b>.</p>
    </div>
  </body></html>`;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const INVITE_FROM = Deno.env.get('INVITE_FROM') || 'onboarding@resend.dev';
    const PLAY_STORE_URL =
      Deno.env.get('PLAY_STORE_URL') ||
      'https://play.google.com/store/apps/details?id=com.grouprei.familyCalendar';

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Supabase enforces JWT verification automatically (verify_jwt = true).
    // If we got here, the caller is authenticated.

    const { to, familyName, inviterEmail } = await req.json();
    if (!to || !familyName) {
      return new Response(
        JSON.stringify({ error: 'Missing "to" or "familyName"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const html = buildHtml({ to, familyName, inviterEmail, playStoreUrl: PLAY_STORE_URL });

    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Agenda da Família <${INVITE_FROM}>`,
        to: [to],
        subject: `Convite para a família "${familyName}"`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return new Response(JSON.stringify({ error: body }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
