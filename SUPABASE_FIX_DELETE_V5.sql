-- =====================================================
-- 🔧 FIX V5 — Bug em V4 corrigido (sintaxe row_to_json)
-- Execute este script no Supabase SQL Editor
-- =====================================================
--
-- BUG em V4: usámos `row_to_json(members.*)` mas a sintaxe correcta é
-- `row_to_json(members)` ou `to_jsonb(members.*)`. V4 pode ter sido
-- criado mas falhava em runtime sem dar feedback.
--
-- V5 retorna boolean simples (sucesso/falha) e usa SQL mais directo.
-- =====================================================

-- Limpa funções antigas que possam estar partidas
drop function if exists public.delete_member(uuid);
drop function if exists public.delete_schedule_type(uuid);

-- =====================================================
-- DELETE MEMBER
-- =====================================================
create or replace function public.delete_member(member_id_to_delete uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_family_id uuid;
  rows_deleted integer;
  caller_is_member boolean;
begin
  -- 1) Encontrar a familia deste membro (SECURITY DEFINER bypasses RLS)
  select family_id into target_family_id
  from public.members
  where id = member_id_to_delete;

  if target_family_id is null then
    raise exception 'Membro não encontrado: %', member_id_to_delete;
  end if;

  -- 2) Verificar que o utilizador autenticado pertence à mesma familia
  select exists(
    select 1 from public.members
    where family_id = target_family_id and user_id = auth.uid()
  ) into caller_is_member;

  if not coalesce(caller_is_member, false) then
    raise exception 'Sem permissão para apagar este membro (não és da familia)';
  end if;

  -- 3) DELETE
  delete from public.members where id = member_id_to_delete;

  get diagnostics rows_deleted = row_count;
  return rows_deleted > 0;
end;
$$;

alter function public.delete_member(uuid) owner to postgres;
revoke all on function public.delete_member(uuid) from public;
grant execute on function public.delete_member(uuid) to authenticated;

-- =====================================================
-- DELETE SCHEDULE TYPE
-- =====================================================
create or replace function public.delete_schedule_type(type_id_to_delete uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_family_id uuid;
  rows_deleted integer;
  caller_is_member boolean;
begin
  select family_id into target_family_id
  from public.schedule_types
  where id = type_id_to_delete;

  if target_family_id is null then
    raise exception 'Tipo de horário não encontrado: %', type_id_to_delete;
  end if;

  select exists(
    select 1 from public.members
    where family_id = target_family_id and user_id = auth.uid()
  ) into caller_is_member;

  if not coalesce(caller_is_member, false) then
    raise exception 'Sem permissão para apagar este tipo (não és da familia)';
  end if;

  delete from public.schedule_types where id = type_id_to_delete;

  get diagnostics rows_deleted = row_count;
  return rows_deleted > 0;
end;
$$;

alter function public.delete_schedule_type(uuid) owner to postgres;
revoke all on function public.delete_schedule_type(uuid) from public;
grant execute on function public.delete_schedule_type(uuid) to authenticated;

-- =====================================================
-- TESTE RÁPIDO (descomenta e troca o UUID por um membro real para testar)
-- =====================================================
-- SELECT public.delete_member('uuid-de-um-membro-aqui');
-- Deve devolver true (e apagar) ou um erro com mensagem clara.
