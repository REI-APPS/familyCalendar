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
//     body: { to, familyName, inviterEmail, locale: 'pt' | 'en' | 'es' }
//   });

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const RESEND_API = 'https://api.resend.com/emails';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Locale = 'pt' | 'en' | 'es';

type Strings = {
  subject: (familyName: string) => string;
  invitedTitle: string;
  invitedBy: (inviter: string | undefined, familyName: string) => string;
  howToAccept: string;
  step1: string;
  step2Pre: string;
  step3: (familyName: string) => string;
  installBtn: string;
  emailNote: (to: string) => string;
  fromName: string;
};

const I18N: Record<Locale, Strings> = {
  pt: {
    subject: (fn) => `Convite para a família "${fn}"`,
    invitedTitle: 'Foste convidado(a)! 🏡',
    invitedBy: (inv, fn) => `${inv ? `<b>${inv}</b>` : 'Alguém'} convidou-te para fazer parte da família <b>"${fn}"</b> na <b>Agenda da Família</b>.`,
    howToAccept: '<b>Como aceitar:</b>',
    step1: 'Instala a app <b>Agenda da Família</b>',
    step2Pre: 'Cria conta usando <b>este mesmo email</b>:',
    step3: (fn) => `Ao entrar pela primeira vez ficas <b>automaticamente</b> associado(a) à família <b>${fn}</b>.`,
    installBtn: 'Instalar Agenda da Família',
    emailNote: (to) => `Importante: o email da conta tem de coincidir com <b>${to}</b>.`,
    fromName: 'Agenda da Família',
  },
  en: {
    subject: (fn) => `Invitation to join the family "${fn}"`,
    invitedTitle: "You're invited! 🏡",
    invitedBy: (inv, fn) => `${inv ? `<b>${inv}</b>` : 'Someone'} invited you to join the family <b>"${fn}"</b> on <b>Family Agenda</b>.`,
    howToAccept: '<b>How to accept:</b>',
    step1: 'Install the <b>Family Agenda</b> app',
    step2Pre: 'Sign up using <b>this same email</b>:',
    step3: (fn) => `On first sign-in you will be <b>automatically</b> linked to the <b>${fn}</b> family.`,
    installBtn: 'Install Family Agenda',
    emailNote: (to) => `Important: your account email must match <b>${to}</b>.`,
    fromName: 'Family Agenda',
  },
  es: {
    subject: (fn) => `Invitación a la familia "${fn}"`,
    invitedTitle: '¡Te han invitado! 🏡',
    invitedBy: (inv, fn) => `${inv ? `<b>${inv}</b>` : 'Alguien'} te ha invitado a unirte a la familia <b>"${fn}"</b> en <b>Agenda Familiar</b>.`,
    howToAccept: '<b>Cómo aceptar:</b>',
    step1: 'Instala la app <b>Agenda Familiar</b>',
    step2Pre: 'Crea cuenta usando <b>este mismo email</b>:',
    step3: (fn) => `Al iniciar sesión por primera vez quedarás <b>automáticamente</b> asociado(a) a la familia <b>${fn}</b>.`,
    installBtn: 'Instalar Agenda Familiar',
    emailNote: (to) => `Importante: el email de la cuenta debe coincidir con <b>${to}</b>.`,
    fromName: 'Agenda Familiar',
  },
};

function pickLocale(input: unknown): Locale {
  const v = typeof input === 'string' ? input.toLowerCase().slice(0, 2) : '';
  if (v === 'pt' || v === 'en' || v === 'es') return v;
  return 'pt';
}

function buildHtml(opts: { to: string; familyName: string; inviterEmail?: string; playStoreUrl: string; locale: Locale }) {
  const s = I18N[opts.locale];
  return `<!doctype html><html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#FDFDF9;padding:24px;color:#2D3142;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E8E5DC;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#FF8FA3;">${s.invitedTitle}</h1>
      <p style="font-size:15px;line-height:22px;">${s.invitedBy(opts.inviterEmail, opts.familyName)}</p>
      <p style="font-size:15px;line-height:22px;margin-top:18px;">${s.howToAccept}</p>
      <ol style="font-size:14px;line-height:24px;color:#7D8299;">
        <li>${s.step1}</li>
        <li>${s.step2Pre} <span style="color:#2D3142;font-weight:700;">${opts.to}</span></li>
        <li>${s.step3(opts.familyName)}</li>
      </ol>
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${opts.playStoreUrl}" style="display:inline-block;background:#FF8FA3;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px;">${s.installBtn}</a>
      </div>
      <p style="font-size:11px;color:#9CA0A8;text-align:center;margin-top:18px;">${s.emailNote(opts.to)}</p>
    </div>
  </body></html>`;
}

serve(async (req) => {
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

    const { to, familyName, inviterEmail, locale: rawLocale, subjectOverride, htmlOverride, fromNameOverride } = await req.json();
    if (!to || !familyName) {
      return new Response(
        JSON.stringify({ error: 'Missing "to" or "familyName"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const locale = pickLocale(rawLocale);
    const strings = I18N[locale];
    // Prefer client-provided localized content; build server-side as fallback.
    const subject = typeof subjectOverride === 'string' && subjectOverride.trim()
      ? subjectOverride
      : strings.subject(familyName);
    const html = typeof htmlOverride === 'string' && htmlOverride.trim()
      ? htmlOverride
      : buildHtml({ to, familyName, inviterEmail, playStoreUrl: PLAY_STORE_URL, locale });
    const fromName = typeof fromNameOverride === 'string' && fromNameOverride.trim()
      ? fromNameOverride
      : strings.fromName;

    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${INVITE_FROM}>`,
        to: [to],
        subject,
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
