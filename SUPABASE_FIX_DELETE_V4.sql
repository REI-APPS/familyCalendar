-- =====================================================
-- 🔧 FIX V4 — DEFINITIVE WORKAROUND
-- RPC functions for DELETE that completely bypass RLS
-- Execute this in Supabase SQL Editor
-- =====================================================
--
-- Why V4?
--  V1, V2, V3 all tried to fix RLS policies. PostgreSQL's RLS engine
--  has subtle recursion behavior that's hard to debug from outside.
--  V4 sidesteps the problem entirely by exposing two SECURITY DEFINER
--  RPC functions (`delete_member`, `delete_schedule_type`) that the
--  frontend will call instead of `supabase.from('members').delete()`.
--
--  These functions:
--    • Run as `postgres` (has BYPASSRLS) — RLS is irrelevant.
--    • Do their OWN permission check using a direct SQL membership lookup.
--    • Return the deleted row as JSON so the app can show a toast.
-- =====================================================

-- DELETE MEMBER
create or replace function public.delete_member(member_id_to_delete uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_family_id uuid;
  deleted_row json;
  is_owner boolean;
begin
  -- Look up the target member (bypasses RLS because we're SECURITY DEFINER)
  select family_id into target_family_id
  from public.members
  where id = member_id_to_delete;

  if target_family_id is null then
    raise exception 'Membro não encontrado';
  end if;

  -- Permission check: current user must be a member of the same family
  select exists(
    select 1 from public.members
    where family_id = target_family_id and user_id = auth.uid()
  ) into is_owner;

  if not coalesce(is_owner, false) then
    raise exception 'Sem permissão para apagar este membro';
  end if;

  -- Delete and return the row
  delete from public.members
  where id = member_id_to_delete
  returning row_to_json(members.*) into deleted_row;

  return deleted_row;
end;
$$;

alter function public.delete_member(uuid) owner to postgres;
revoke all on function public.delete_member(uuid) from public;
grant execute on function public.delete_member(uuid) to authenticated;

-- DELETE SCHEDULE TYPE
create or replace function public.delete_schedule_type(type_id_to_delete uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_family_id uuid;
  deleted_row json;
  is_member boolean;
begin
  select family_id into target_family_id
  from public.schedule_types
  where id = type_id_to_delete;

  if target_family_id is null then
    raise exception 'Tipo não encontrado';
  end if;

  select exists(
    select 1 from public.members
    where family_id = target_family_id and user_id = auth.uid()
  ) into is_member;

  if not coalesce(is_member, false) then
    raise exception 'Sem permissão para apagar este tipo';
  end if;

  delete from public.schedule_types
  where id = type_id_to_delete
  returning row_to_json(schedule_types.*) into deleted_row;

  return deleted_row;
end;
$$;

alter function public.delete_schedule_type(uuid) owner to postgres;
revoke all on function public.delete_schedule_type(uuid) from public;
grant execute on function public.delete_schedule_type(uuid) to authenticated;

-- =====================================================
-- DONE. The frontend will now call:
--   supabase.rpc('delete_member', { member_id_to_delete: id })
--   supabase.rpc('delete_schedule_type', { type_id_to_delete: id })
-- =====================================================
