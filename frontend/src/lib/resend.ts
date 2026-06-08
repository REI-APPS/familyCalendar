// Invite email sender.
//
// Preferred path: Supabase Edge Function `send-invite` (RESEND_API_KEY lives
// only on the server, never bundled in the APK).
//
// Fallback (legacy): direct Resend call using EXPO_PUBLIC_RESEND_KEY embedded
// in the bundle. Kept for backwards compatibility until the Edge Function
// is deployed by every environment.

import { supabase } from './supabase';
import i18n from '../i18n';

const LEGACY_KEY = process.env.EXPO_PUBLIC_RESEND_KEY || '';
const LEGACY_FROM = process.env.EXPO_PUBLIC_INVITE_FROM || 'onboarding@resend.dev';
const PLAY_STORE_URL =
  process.env.EXPO_PUBLIC_PLAY_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.grouprei.familyCalendar';

type Opts = { to: string; familyName: string; inviterEmail?: string };
type Result = { ok: boolean; error?: string };
type Locale = 'pt' | 'en' | 'es';

function currentLocale(): Locale {
  const lng = (i18n.language || 'pt').slice(0, 2).toLowerCase();
  if (lng === 'en' || lng === 'es') return lng;
  return 'pt';
}

type Strings = {
  fromName: string;
  subject: (fn: string) => string;
  title: string;
  invitedBy: (inv: string | undefined, fn: string) => string;
  howToAccept: string;
  step1: string;
  step2Pre: string;
  step3: (fn: string) => string;
  installBtn: string;
  emailNote: (to: string) => string;
};

const I18N: Record<Locale, Strings> = {
  pt: {
    fromName: 'Agenda da Família',
    subject: (fn) => `Convite para a família "${fn}"`,
    title: 'Foste convidado(a)! 🏡',
    invitedBy: (inv, fn) => `${inv ? `<b>${inv}</b>` : 'Alguém'} convidou-te para fazer parte da família <b>"${fn}"</b> na <b>Agenda da Família</b>.`,
    howToAccept: '<b>Como aceitar:</b>',
    step1: 'Instala a app <b>Agenda da Família</b>',
    step2Pre: 'Cria conta usando <b>este mesmo email</b>:',
    step3: (fn) => `Ao entrar pela primeira vez ficas <b>automaticamente</b> associado(a) à família <b>${fn}</b>.`,
    installBtn: 'Instalar Agenda da Família',
    emailNote: (to) => `Importante: o email da conta tem de coincidir com <b>${to}</b>.`,
  },
  en: {
    fromName: 'Family Agenda',
    subject: (fn) => `Invitation to join the family "${fn}"`,
    title: "You're invited! 🏡",
    invitedBy: (inv, fn) => `${inv ? `<b>${inv}</b>` : 'Someone'} invited you to join the family <b>"${fn}"</b> on <b>Family Agenda</b>.`,
    howToAccept: '<b>How to accept:</b>',
    step1: 'Install the <b>Family Agenda</b> app',
    step2Pre: 'Sign up using <b>this same email</b>:',
    step3: (fn) => `On first sign-in you will be <b>automatically</b> linked to the <b>${fn}</b> family.`,
    installBtn: 'Install Family Agenda',
    emailNote: (to) => `Important: your account email must match <b>${to}</b>.`,
  },
  es: {
    fromName: 'Agenda Familiar',
    subject: (fn) => `Invitación a la familia "${fn}"`,
    title: '¡Te han invitado! 🏡',
    invitedBy: (inv, fn) => `${inv ? `<b>${inv}</b>` : 'Alguien'} te ha invitado a unirte a la familia <b>"${fn}"</b> en <b>Agenda Familiar</b>.`,
    howToAccept: '<b>Cómo aceptar:</b>',
    step1: 'Instala la app <b>Agenda Familiar</b>',
    step2Pre: 'Crea cuenta usando <b>este mismo email</b>:',
    step3: (fn) => `Al iniciar sesión por primera vez quedarás <b>automáticamente</b> asociado(a) a la familia <b>${fn}</b>.`,
    installBtn: 'Instalar Agenda Familiar',
    emailNote: (to) => `Importante: el email de la cuenta debe coincidir con <b>${to}</b>.`,
  },
};

function buildHtml(opts: Opts, locale: Locale): string {
  const s = I18N[locale];
  return `<!doctype html><html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#FDFDF9;padding:24px;color:#2D3142;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E8E5DC;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#FF8FA3;">${s.title}</h1>
      <p style="font-size:15px;line-height:22px;">${s.invitedBy(opts.inviterEmail, opts.familyName)}</p>
      <p style="font-size:15px;line-height:22px;margin-top:18px;">${s.howToAccept}</p>
      <ol style="font-size:14px;line-height:24px;color:#7D8299;">
        <li>${s.step1}</li>
        <li>${s.step2Pre} <span style="color:#2D3142;font-weight:700;">${opts.to}</span></li>
        <li>${s.step3(opts.familyName)}</li>
      </ol>
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${PLAY_STORE_URL}" style="display:inline-block;background:#FF8FA3;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px;">${s.installBtn}</a>
      </div>
      <p style="font-size:11px;color:#9CA0A8;text-align:center;margin-top:18px;">${s.emailNote(opts.to)}</p>
    </div></body></html>`;
}

async function sendViaEdgeFunction(opts: Opts, locale: Locale): Promise<Result | null> {
  try {
    const s = I18N[locale];
    const html = buildHtml(opts, locale);
    const { data, error } = await supabase.functions.invoke('send-invite', {
      body: {
        // Legacy fields (kept so the old edge function code keeps working)
        to: opts.to,
        familyName: opts.familyName,
        inviterEmail: opts.inviterEmail,
        locale,
        // New override fields — if the deployed function supports them, it
        // will relay these verbatim (fully localized on the client side).
        subjectOverride: s.subject(opts.familyName),
        htmlOverride: html,
        fromNameOverride: s.fromName,
      },
    });
    if (error) {
      const status = (error as any)?.context?.status;
      if (status === 404) return null; // function not deployed -> fallback
      return { ok: false, error: error.message || 'Edge function error' };
    }
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch {
    return null; // network/parse error → fallback
  }
}

async function sendViaLegacyResend(opts: Opts, locale: Locale): Promise<Result> {
  if (!LEGACY_KEY) return { ok: false, error: 'Resend não configurado' };
  const s = I18N[locale];
  const html = buildHtml(opts, locale);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LEGACY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${s.fromName} <${LEGACY_FROM}>`,
        to: [opts.to],
        subject: s.subject(opts.familyName),
        html,
      }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Erro de rede' };
  }
}

export async function sendInviteEmail(opts: Opts): Promise<Result> {
  const locale = currentLocale();
  // Strategy: prefer the LEGACY path when EXPO_PUBLIC_RESEND_KEY is configured,
  // because it guarantees the email is rendered with the app's current locale
  // (server-side localization depends on the Edge Function being redeployed).
  // The Edge Function path is kept as a safety net for production builds
  // where the key is stripped from the bundle.
  if (LEGACY_KEY) {
    const legacy = await sendViaLegacyResend(opts, locale);
    if (legacy.ok) return legacy;
    // Legacy failed → try Edge Function as last resort
    const edge = await sendViaEdgeFunction(opts, locale);
    if (edge && edge.ok) return edge;
    return legacy; // surface original error
  }
  // No legacy key → use Edge Function only
  const edge = await sendViaEdgeFunction(opts, locale);
  if (edge !== null) return edge;
  return { ok: false, error: 'No email path available' };
}
