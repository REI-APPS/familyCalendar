-- =====================================================
-- 🔧 INVITES — auto-accept on login
-- Execute este script no Supabase SQL Editor
-- =====================================================
--
-- Quando um utilizador faz signup ou login, a app chama este RPC.
-- A função procura convites pendentes para o email do utilizador,
-- insere-o como membro nessas famílias e marca os convites como aceites.
-- =====================================================

create or replace function public.accept_pending_invites()
returns table(family_id uuid, family_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_uid uuid;
  caller_email text;
  inv record;
begin
  caller_uid := auth.uid();
  if caller_uid is null then
    return;
  end if;

  -- Buscar o email do utilizador autenticado (na schema auth)
  select email into caller_email from auth.users where id = caller_uid;
  if caller_email is null then
    return;
  end if;

  -- Para cada convite pendente que bate certo com o email do user
  for inv in
    select i.id, i.family_id, f.name as family_name
    from public.invites i
    join public.families f on f.id = i.family_id
    where lower(i.email) = lower(caller_email)
      and i.status = 'pending'
  loop
    -- 1) Garantir que o user é membro dessa familia
    insert into public.members(family_id, user_id, name, color, role)
    select inv.family_id, caller_uid, split_part(caller_email, '@', 1), '#A2D2FF', 'member'
    where not exists (
      select 1 from public.members
      where family_id = inv.family_id and user_id = caller_uid
    );

    -- 2) Marcar convite como aceite
    update public.invites set status = 'accepted' where id = inv.id;

    family_id := inv.family_id;
    family_name := inv.family_name;
    return next;
  end loop;
end;
$$;

alter function public.accept_pending_invites() owner to postgres;
revoke all on function public.accept_pending_invites() from public;
grant execute on function public.accept_pending_invites() to authenticated;

-- TESTE: depois de fazer login, esta chamada devolve as familias a que foi adicionado
-- SELECT * FROM public.accept_pending_invites();
