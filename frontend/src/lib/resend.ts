// Invite email sender.
//
// Preferred path: Supabase Edge Function `send-invite` (RESEND_API_KEY lives
// only on the server, never bundled in the APK).
//
// Fallback (legacy): direct Resend call using EXPO_PUBLIC_RESEND_KEY embedded
// in the bundle. Kept for backwards compatibility until the Edge Function
// is deployed by every environment. To disable the fallback once the function
// is in production, simply remove EXPO_PUBLIC_RESEND_KEY from EAS env vars.

import { supabase } from './supabase';

const LEGACY_KEY = process.env.EXPO_PUBLIC_RESEND_KEY || '';
const LEGACY_FROM = process.env.EXPO_PUBLIC_INVITE_FROM || 'onboarding@resend.dev';
const PLAY_STORE_URL =
  process.env.EXPO_PUBLIC_PLAY_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.grouprei.familyCalendar';

type Opts = { to: string; familyName: string; inviterEmail?: string };
type Result = { ok: boolean; error?: string };

async function sendViaEdgeFunction(opts: Opts): Promise<Result | null> {
  try {
    const { data, error } = await supabase.functions.invoke('send-invite', {
      body: { to: opts.to, familyName: opts.familyName, inviterEmail: opts.inviterEmail },
    });
    if (error) {
      // FunctionsHttpError exposes a `context` with the response. If the
      // function is not deployed (404) we return null to trigger fallback.
      const status = (error as any)?.context?.status;
      if (status === 404) return null; // function not deployed -> fallback
      return { ok: false, error: error.message || 'Edge function error' };
    }
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch (e: any) {
    // Network/parse error — try fallback
    return null;
  }
}

async function sendViaLegacyResend(opts: Opts): Promise<Result> {
  if (!LEGACY_KEY) return { ok: false, error: 'Resend não configurado' };
  const html = `<!doctype html><html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#FDFDF9;padding:24px;color:#2D3142;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E8E5DC;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#FF8FA3;">Foste convidado(a)! 🏡</h1>
      <p style="font-size:15px;line-height:22px;">${opts.inviterEmail ? `<b>${opts.inviterEmail}</b>` : 'Alguém'} convidou-te para fazer parte da família <b>"${opts.familyName}"</b>.</p>
      <ol style="font-size:14px;line-height:24px;color:#7D8299;">
        <li>Instala a app <b>Agenda da Família</b></li>
        <li>Cria conta com este mesmo email: <b>${opts.to}</b></li>
        <li>Ficas automaticamente associado(a) à família.</li>
      </ol>
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${PLAY_STORE_URL}" style="display:inline-block;background:#FF8FA3;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;">Instalar</a>
      </div>
    </div></body></html>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LEGACY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Agenda da Família <${LEGACY_FROM}>`,
        to: [opts.to],
        subject: `Convite para a família "${opts.familyName}"`,
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
  // 1) Try Edge Function first (preferred)
  const edge = await sendViaEdgeFunction(opts);
  if (edge !== null) return edge;
  // 2) Fallback to legacy client-side Resend call
  return await sendViaLegacyResend(opts);
}
