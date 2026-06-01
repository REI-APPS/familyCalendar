# 🔐 Mover Resend para Supabase Edge Function

Este guia move a chave Resend do APK (onde é tecnicamente visível) para um servidor Supabase Edge Function (onde só vive em memória do servidor). Após este processo, **a chave Resend deixa de estar no APK**.

---

## 🏁 Pré-requisitos

1. Tens uma conta Supabase com o projecto da Agenda da Família
2. Tens **Docker Desktop** instalado (necessário para a Supabase CLI funcionar localmente — mas para o **deploy** é opcional)

---

## 📥 Passo 1 — Instala a Supabase CLI

No teu PC:

```bash
# Windows (PowerShell)
scoop install supabase
# OU via npm (qualquer SO)
npm install -g supabase
```

Verifica:

```bash
supabase --version
```

---

## 🔗 Passo 2 — Liga a CLI ao teu projecto

Em `C:\REPO_REI\familyCalendar\`:

```bash
supabase login                # abre o browser, autoriza
supabase link --project-ref mjsgsywpsfrrejtrlmli
```

> O `project-ref` vai buscar-se ao URL do teu projecto (`https://mjsgsywpsfrrejtrlmli.supabase.co` → ref = `mjsgsywpsfrrejtrlmli`).

---

## 🔑 Passo 3 — Guarda os secrets no servidor

```bash
supabase secrets set RESEND_API_KEY=re_6PmL9DFk_maXMiiA5pKPVPD4PK7n4CCoY
supabase secrets set INVITE_FROM=convites@familycalendar.grouprei.com
supabase secrets set PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.grouprei.familyCalendar
```

Confirma:

```bash
supabase secrets list
```

> Os secrets ficam encriptados no servidor Supabase. **Nunca aparecem no bundle do APK.**

---

## 🚀 Passo 4 — Deploy da Edge Function

O ficheiro já existe em `/app/supabase/functions/send-invite/index.ts`. Copia esta pasta para o teu projecto local em `C:\REPO_REI\familyCalendar\supabase\functions\send-invite\index.ts` (mantém a estrutura exacta).

Depois:

```bash
cd C:\REPO_REI\familyCalendar
supabase functions deploy send-invite
```

Output esperado:
```
Deploying Function: send-invite (project ref: mjsgsywpsfrrejtrlmli)
Deploying Function: send-invite (script size: ...)
Deployed Function: send-invite
You can inspect your deployment in the Dashboard:
https://supabase.com/dashboard/project/mjsgsywpsfrrejtrlmli/functions
```

---

## 🧪 Passo 5 — Testa manualmente

No browser ou Postman:

```bash
curl -X POST 'https://mjsgsywpsfrrejtrlmli.supabase.co/functions/v1/send-invite' \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"to":"teste@example.com","familyName":"Familia X","inviterEmail":"meu@email.com"}'
```

Resposta esperada: `{"ok":true,"id":"xxx-yyy-zzz"}`

Vai ao painel Resend → Emails → vais ver o email enviado.

---

## 📱 Passo 6 — A app já está pronta

O ficheiro `src/lib/resend.ts` foi reescrito para:

1. **Tentar primeiro a Edge Function** via `supabase.functions.invoke('send-invite', ...)`
2. **Se a Edge Function devolver 404** (não deployed), faz fallback para a chamada directa (legacy)

Isto significa que **mesmo antes de fazeres o deploy**, a app continua a funcionar. Após o deploy, automaticamente passa a usar a Edge Function — sem rebuild!

> Faz `eas update --branch preview --message "use edge function for invites"` apenas para garantir que a app tem a última versão do `resend.ts`.

---

## 🧹 Passo 7 — Remove a chave do APK (opcional mas recomendado)

Quando confirmares que a Edge Function funciona:

```bash
eas env:delete preview --name EXPO_PUBLIC_RESEND_KEY
eas env:delete production --name EXPO_PUBLIC_RESEND_KEY
```

Depois faz **novo build** (`eas build -p android --profile production`) para o APK ficar sem a chave Resend embutida.

Se a Edge Function falhar por algum motivo, o fallback legacy também falhará (porque a chave já não está no bundle), e a app mostrará "Resend não configurado". Garante que a Edge Function está bem testada antes deste passo.

---

## ✅ Resultado final

| Antes | Depois |
|---|---|
| 🔓 Chave Resend dentro do APK | 🔐 Chave Resend só no servidor Supabase |
| Cliente chama `api.resend.com` directamente | Cliente chama Edge Function autenticada (JWT) |
| Qualquer pessoa que descompile o APK vê a chave | Impossível ver a chave do lado do cliente |
| Free tier Resend partilhado pelos utilizadores | Idem (mas com possibilidade de adicionar rate limit no servidor) |

---

## 🔧 Melhorias futuras (opcional)

Dentro da Edge Function podes ainda:

1. **Verificar que o caller é membro da família** que está a convidar (chamar o teu próprio Postgres via `createClient(supabaseUrl, serviceRoleKey)`)
2. **Rate-limit** por user (ex: máx 10 convites por hora)
3. **Validar formato do email** com regex
4. **Registar histórico** de convites enviados numa tabela `email_log`

Mas para a v1.0, o que está agora chega perfeitamente.

---

## 🐛 Troubleshooting

| Erro | Causa | Fix |
|---|---|---|
| 404 Function not found | Não fizeste deploy | `supabase functions deploy send-invite` |
| 401 Invalid JWT | Sessão expirada na app | Logout + login |
| 500 RESEND_API_KEY not configured | Esqueceste secret | `supabase secrets set RESEND_API_KEY=...` |
| Email não chega | Domínio não verificado no Resend | Painel Resend → Domains → Verify |
