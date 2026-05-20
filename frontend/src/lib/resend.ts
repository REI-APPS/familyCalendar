// Lightweight Resend client. Note: Resend API key is embedded in the client
// bundle via EXPO_PUBLIC_*. This is acceptable for a personal/family app on the
// Resend free tier, but for higher-scale production move this call to a
// Supabase Edge Function or your own backend.

const RESEND_URL = 'https://api.resend.com/emails';
const KEY = process.env.EXPO_PUBLIC_RESEND_KEY || '';
const FROM = process.env.EXPO_PUBLIC_INVITE_FROM || 'onboarding@resend.dev';

export async function sendInviteEmail(opts: {
  to: string;
  familyName: string;
  inviterEmail?: string;
}) {
  if (!KEY) return { ok: false, error: 'Resend não configurado' };
  const html = `
  <!doctype html><html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#FDFDF9;padding:24px;color:#2D3142;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E8E5DC;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#FF8FA3;">Foste convidado(a)! 🏡</h1>
      <p style="font-size:15px;line-height:22px;">${opts.inviterEmail ? `<b>${opts.inviterEmail}</b>` : 'Alguém'} convidou-te para fazer parte da família <b>"${opts.familyName}"</b> na <b>Agenda da Família</b>.</p>
      <p style="font-size:15px;line-height:22px;">Para aceder:</p>
      <ol style="font-size:14px;line-height:24px;color:#7D8299;">
        <li>Instala a app <b>Agenda da Família</b> (Google Play)</li>
        <li>Cria conta com este mesmo email: <b>${opts.to}</b></li>
        <li>Vais ficar automaticamente associado(a) à família</li>
      </ol>
      <p style="font-size:12px;color:#9CA0A8;margin-top:24px;">Recebeste este email porque foste convidado(a) por um membro da família. Se foi engano, ignora.</p>
    </div>
  </body></html>`;
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Agenda da Família <${FROM}>`,
        to: [opts.to],
        subject: `Convite para a família "${opts.familyName}"`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Erro de rede' };
  }
}
