-- =====================================================
-- 🔧 DELETE ACCOUNT — apaga utilizador e família se for o último
-- Execute este script no Supabase SQL Editor
-- =====================================================
--
-- Comportamento:
--  1. Apaga todos os members rows do utilizador (cascade: entries também)
--  2. Para cada família onde o utilizador era membro, se já não houver
--     mais nenhum membro, apaga a família (cascade: schedule_types,
--     invites, etc.)
--  3. Apaga o registo do utilizador em auth.users
--
-- Após a chamada, o cliente deve fazer `supabase.auth.signOut()` (já vai
-- estar invalidado mas é boa prática).
-- =====================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_uid uuid;
  fam_id uuid;
  remaining int;
begin
  caller_uid := auth.uid();
  if caller_uid is null then
    raise exception 'Não autenticado';
  end if;

  -- 1) Para cada familia onde o utilizador estava como member, apagar
  --    o seu row e verificar se ficou vazia (para apagar a familia)
  for fam_id in
    select distinct family_id from public.members where user_id = caller_uid
  loop
    -- remover o membro (cascade apaga schedule_entries deste membro)
    delete from public.members where user_id = caller_uid and family_id = fam_id;

    -- contar quantos members restam na familia
    select count(*) into remaining from public.members where family_id = fam_id;

    if remaining = 0 then
      -- familia ficou vazia, apagar tudo (cascade)
      delete from public.families where id = fam_id;
    end if;
  end loop;

  -- 2) Apagar o utilizador em auth.users
  delete from auth.users where id = caller_uid;
end;
$$;

alter function public.delete_my_account() owner to postgres;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
