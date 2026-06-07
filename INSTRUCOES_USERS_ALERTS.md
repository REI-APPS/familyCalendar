# 🚀 Instalação SQL — Utilizadores + Alertas

## ⚠️ Passo OBRIGATÓRIO antes de testar os novos ecrãs

Abre o **SQL Editor** do Supabase (https://app.supabase.com → o teu projeto → SQL Editor) e cola/executa **na íntegra** o ficheiro:

```
/app/SUPABASE_USERS_AND_ALERTS.sql
```

Este script cria:

1. **`list_family_users(fid)`** RPC — devolve a lista de utilizadores autenticados associados à família (com email + role + nome do member).
2. **`admin_remove_family_user(fid, target_user_id)`** RPC — permite ao dono da família remover outro utilizador (apaga o member, NÃO apaga a conta auth.users).
3. **`change_log`** tabela — regista alterações em `schedule_entries` e `tasks` para os próximos 14 dias.
4. **`user_changes_seen`** tabela — guarda o último timestamp visto por cada utilizador.
5. **Triggers** em `schedule_entries` e `tasks` que populam `change_log` automaticamente.
6. **`get_unseen_changes()`** RPC — devolve alterações novas (limita a 50) e marca como vistas.

## ✅ Como verificar

Depois de correr o SQL:

1. Vai a **Ajustes** na app → vês uma nova secção **"Utilizadores registados"** com os emails reais e botões de remover (se fores o dono).
2. Pede a outro utilizador para fazer uma alteração na agenda nos próximos 14 dias. Da próxima vez que abrires a app, aparece um popup **"Alterações recentes"** uma única vez.

## 📧 Função send-invite (localização do email)

A Edge Function `supabase/functions/send-invite/index.ts` foi atualizada para aceitar `locale` (`pt`, `en`, `es`). Tens de a **redeployar**:

```bash
supabase functions deploy send-invite
```

O cliente (`src/lib/resend.ts`) passa automaticamente o idioma ativo da app.
