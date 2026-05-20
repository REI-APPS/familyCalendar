# 📧 Configurar Resend como SMTP do Supabase

## Porquê?

O email **de confirmação** (signup/reset password) é enviado pelo Supabase
através do seu próprio servidor SMTP gratuito (limite muito baixo,
não usa o teu domínio). Para que **todos** os emails (incluindo confirmação)
saiam do teu domínio `convites@familycalendar.grouprei.com` via Resend, tens
de configurar Custom SMTP no Supabase.

> Nota: os emails de **convite** que enviamos do app (via `sendInviteEmail`)
> JÁ usam o Resend e o teu domínio. Esta configuração só afecta os emails
> de Auth do Supabase (signup, magic link, password reset).

## Passos

### 1️⃣ Obter credenciais SMTP do Resend

Resend expõe um servidor SMTP. As credenciais são:

- **Host:** `smtp.resend.com`
- **Port:** `465` (TLS) ou `587` (STARTTLS)
- **Username:** `resend`
- **Password:** A tua chave API (a mesma `re_...` que já tens no `.env`)

### 2️⃣ Configurar no Supabase

1. Vai a https://supabase.com/dashboard → o teu projecto
2. Menu lateral: **Project Settings** → **Authentication** → secção **SMTP Settings**
3. Activa **"Enable Custom SMTP"**
4. Preenche:
   - **Sender email:** `convites@familycalendar.grouprei.com`
   - **Sender name:** `Agenda da Família`
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** `re_6PmL9DFk_maXMiiA5pKPVPD4PK7n4CCoY` (a tua chave Resend)
   - **Minimum interval between emails:** 60 (ou 0 para sem limite)
5. **Save**
6. Testa criando uma conta nova → o email de confirmação agora vem do Resend
   com o teu domínio.

### 3️⃣ Personalizar templates (opcional)

No mesmo painel, **Authentication** → **Email Templates** podes mudar:

- "Confirm signup"
- "Magic Link"
- "Change Email Address"
- "Reset Password"

para usar HTML em Português com o branding da Agenda da Família.

### 4️⃣ Verificação no Resend Dashboard

Em https://resend.com/emails vais ver TODOS os emails enviados (convites
da app + auth do Supabase), com estatísticas de delivery, opens, etc.
