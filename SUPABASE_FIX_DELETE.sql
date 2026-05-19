-- =====================================================
-- 🔧 FIX MIGRATION — RLS recursion blocking DELETE
-- Execute this in Supabase SQL Editor
-- =====================================================
--
-- WHY: The original user_family_ids() function used
-- `language sql` which Postgres can inline into the calling
-- query. When called from the DELETE policy on `members`,
-- the inlined SELECT touches `members` again, causing
-- Postgres to silently return 0 rows (treated as recursion).
--
-- FIX: rewrite the function in `plpgsql` so it cannot be
-- inlined. The `security definer` context is preserved and
-- RLS on the inner query is bypassed (function owner = postgres).
-- =====================================================

drop function if exists public.user_family_ids();

create or replace function public.user_family_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select m.family_id
    from public.members m
    where m.user_id = auth.uid();
end;
$$;

alter function public.user_family_ids() owner to postgres;
grant execute on function public.user_family_ids() to authenticated;

-- Also make the DELETE policy more robust as a belt-and-braces fix.
-- Allows deleting members whose family the current user belongs to.
drop policy if exists "delete members own family" on public.members;
create policy "delete members own family" on public.members
  for delete to authenticated
  using (
    exists (
      select 1
      from public.members owner_member
      where owner_member.family_id = members.family_id
        and owner_member.user_id = auth.uid()
    )
  );

-- Same hardening for schedule_types DELETE (just in case)
drop policy if exists "delete schedule_types" on public.schedule_types;
create policy "delete schedule_types" on public.schedule_types
  for delete to authenticated
  using (
    exists (
      select 1
      from public.members owner_member
      where owner_member.family_id = schedule_types.family_id
        and owner_member.user_id = auth.uid()
    )
  );

-- Sanity check — should return your family id(s)
-- select public.user_family_ids();
