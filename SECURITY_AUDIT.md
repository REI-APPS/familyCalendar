# 🔒 Auditoria de Segurança — Agenda da Família (pré-Play Store)

Data: revisão completa pré-release Android

---

## 1. Autenticação (Supabase Auth)

### ✅ O que está bem
- **Login com email + password** via `supabase.auth.signInWithPassword` (TLS obrigatório).
- **Tokens JWT assinados** pela Supabase com chave privada do projecto — impossíveis de forjar do lado do cliente.
- **AutoRefresh activo** (`autoRefreshToken: true`) — sessões renovadas silenciosamente sem expor refresh tokens nos logs.
- **Persistência segura** via `AsyncStorage` (encriptado em repouso pelo Android quando o ecrã tem PIN/biometria).
- **Sign out** invalida o token e remove-o do AsyncStorage.
- **Mudança de palavra-passe** via `supabase.auth.updateUser({ password })` — só funciona com sessão ativa.

### 🟡 Recomendado (já configurado, confirmar no dashboard)
- **Confirm email = OFF** (decidido) — convite Resend é a verificação real.
- **Password min length = 6** (validado no client). Considera aumentar para 8 caracteres no painel Supabase → Authentication → Policies.
- **Habilitar Captcha** no painel Supabase para signup (Authentication → Bot Protection) — opcional mas recomendado para evitar abuse.

### ❌ Risco actual
Nenhum — o fluxo é standard e seguro.

---

## 2. Base de Dados (PostgreSQL + RLS)

### ✅ O que está bem
- **Row Level Security activado em TODAS as tabelas:** families, members, schedule_types, member_schedule_types, schedule_entries, tasks, invites.
- **Policies usam `is_in_family(family_id)`** — uma `SECURITY DEFINER` com owner `postgres` (BYPASSRLS) que evita recursão. Cada utilizador só vê dados das famílias a que pertence.
- **DELETE via RPCs** (`delete_member`, `delete_schedule_type`, `delete_task`, `delete_my_account`) — cada um verifica internamente se o caller é membro da família antes de apagar.
- **CASCADE FK** — apagar uma família apaga automaticamente schedule_types, members, entries, tasks, invites (limpeza total).
- **Realtime channels** filtrados por `family_id` — utilizador só recebe eventos da sua família.

### 🟡 Recomendado
- **Service Role Key** NUNCA está no app. Apenas o `anon` key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) que tem só permissões de RLS. ✅ Confirmado.
- **Audit:** correr no Supabase SQL Editor `select * from pg_policies where schemaname = 'public';` e confirmar que toda a tabela tem policies activas.
- **Backups:** ativar Point-in-Time Recovery em Supabase Project Settings → Database → Backups (free tier tem backup diário).

---

## 3. Chaves no bundle (EXPO_PUBLIC_*)

### Variáveis embutidas no APK:
| Variável | Tipo de risco | Justificação |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | 🟢 Baixo | URL público; RLS protege os dados. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 🟢 Baixo | Anon key foi desenhada para ser pública; cliente só pode fazer o que RLS permite. |
| `EXPO_PUBLIC_RESEND_KEY` | 🟡 Médio | Permite enviar emails via Resend em nome do teu domínio. Se vazar, alguém podia enviar spam até o limite mensal. |
| `EXPO_PUBLIC_INVITE_FROM` | 🟢 Baixo | Apenas um endereço de email. |

### 🔧 Recomendação para o Resend Key (futuro)
Para apps com muitos utilizadores ou risco maior, **mover o envio de emails para uma Supabase Edge Function** que guarda a chave Resend nos secrets do servidor. Para uma app familiar com poucos utilizadores, o risco actual é aceitável.

---

## 4. Transporte (HTTPS / TLS)

- **Todas as ligações usam HTTPS:**
  - `https://mjsgsywpsfrrejtrlmli.supabase.co` (Supabase)
  - `https://api.resend.com/emails` (Resend)
- **Supabase Realtime usa WSS** (WebSocket Secure).
- **No texto plano** em qualquer ligação.

---

## 5. Permissões Android

Verificar `app.json` → `expo.android.permissions`. Para Agenda da Família **apenas** precisamos de:
- INTERNET (default)
- Nenhuma das sensíveis: NO `READ_CONTACTS`, NO `ACCESS_FINE_LOCATION`, NO `CAMERA`, NO `RECORD_AUDIO`.

Quanto menos pedires, mais confiança a Play Store dá no aprovamento.

---

## 6. Logs / Console

### 🟡 Atenção
Há vários `console.log` no código (`[delete_member] response:`, `[invites] auto-accepted:`, etc.) — em **produção**, podem expor IDs e estrutura.

### 🔧 Recomendação
Antes do build de produção, podes silenciar logs em release.
Edita `app/_layout.tsx` (no topo, fora do componente):

```ts
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
}
```

Isto silencia logs em build production mantendo-os em development.

---

## 7. Atualizações OTA (expo-updates)

- Os updates via `eas update` são **assinados** pelo EAS automaticamente
- Apenas updates assinados pelo MESMO `EAS_PROJECT_ID` são aceites pela app
- Impossível um atacante "empurrar" código para a tua app

---

## ✅ Checklist final pré-release

- [ ] No painel Supabase: **Confirm email = OFF** (definido)
- [ ] Correr `select * from pg_policies where schemaname = 'public';` e confirmar policies em todas as tabelas
- [ ] Adicionar `if (!__DEV__) console.log = () => {};` no `_layout.tsx`
- [ ] Confirmar que `app.json` não pede permissões desnecessárias
- [ ] Definir password mínima de 8 caracteres no painel Supabase
- [ ] Ativar PITR em Supabase Backups
- [ ] (opcional) Captcha em signup
- [ ] Submeter à Play Store: `eas build -p android --profile production` → `eas submit -p android`

---

## 📞 Em caso de incidente

1. **Suspeita de chave Resend vazada:** rotaciona em https://resend.com/api-keys → atualiza no EAS env vars → novo build
2. **Suspeita de utilizador comprometido:** Supabase Dashboard → Authentication → Users → remove user → triggers o cascade de tudo o que criou
3. **Bug crítico:** roll back com `eas update --branch preview --commit-message "rollback"` apontando para commit anterior
