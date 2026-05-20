-- =====================================================
-- 🔧 FIX V2 — DEFINITIVE: RLS recursion blocking DELETE
-- Execute this in Supabase SQL Editor as a single script
-- =====================================================
--
-- Why V2?
--  • The previous fix recreated a SELECT-based subquery against
--    `members` inside the DELETE policy of `members`. RLS still
--    applies to that inner SELECT → recursion / 0 rows.
--  • This V2 introduces a boolean helper `is_in_family(uuid)` that
--    runs as SECURITY DEFINER with owner = postgres (BYPASSRLS),
--    so the membership check never touches RLS again.
--  • All policies on members / schedule_types / member_schedule_types
--    / schedule_entries / families / invites are rewritten to use it.
-- =====================================================

-- 1) Helper: returns true if the current auth.uid() belongs to family
create or replace function public.is_in_family(fid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found boolean;
begin
  select exists(
    select 1 from public.members
    where family_id = fid and user_id = auth.uid()
  ) into found;
  return coalesce(found, false);
end;
$$;

alter function public.is_in_family(uuid) owner to postgres;
grant execute on function public.is_in_family(uuid) to authenticated;

-- 2) Keep user_family_ids() working (other code uses it).  Same
--    treatment: plpgsql + security definer + owner postgres.
create or replace function public.user_family_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select m.family_id from public.members m where m.user_id = auth.uid();
end;
$$;

alter function public.user_family_ids() owner to postgres;
grant execute on function public.user_family_ids() to authenticated;

-- 3) FAMILIES policies
drop policy if exists "view own families" on public.families;
drop policy if exists "create families" on public.families;
drop policy if exists "update own families" on public.families;
drop policy if exists "delete own families" on public.families;

create policy "view own families" on public.families for select to authenticated
  using (public.is_in_family(id) or created_by = auth.uid());

create policy "create families" on public.families for insert to authenticated
  with check (created_by = auth.uid());

create policy "update own families" on public.families for update to authenticated
  using (public.is_in_family(id));

create policy "delete own families" on public.families for delete to authenticated
  using (created_by = auth.uid());

-- 4) MEMBERS policies
drop policy if exists "view members of own family" on public.members;
drop policy if exists "insert members own family" on public.members;
drop policy if exists "update members own family" on public.members;
drop policy if exists "delete members own family" on public.members;

create policy "view members of own family" on public.members for select to authenticated
  using (public.is_in_family(family_id) or user_id = auth.uid());

create policy "insert members own family" on public.members for insert to authenticated
  with check (
    public.is_in_family(family_id)
    or exists (select 1 from public.families f where f.id = family_id and f.created_by = auth.uid())
    or user_id = auth.uid()
  );

create policy "update members own family" on public.members for update to authenticated
  using (public.is_in_family(family_id));

create policy "delete members own family" on public.members for delete to authenticated
  using (public.is_in_family(family_id));

-- 5) SCHEDULE_TYPES policies
drop policy if exists "select schedule_types" on public.schedule_types;
drop policy if exists "insert schedule_types" on public.schedule_types;
drop policy if exists "update schedule_types" on public.schedule_types;
drop policy if exists "delete schedule_types" on public.schedule_types;

create policy "select schedule_types" on public.schedule_types for select to authenticated
  using (public.is_in_family(family_id));

create policy "insert schedule_types" on public.schedule_types for insert to authenticated
  with check (public.is_in_family(family_id));

create policy "update schedule_types" on public.schedule_types for update to authenticated
  using (public.is_in_family(family_id));

create policy "delete schedule_types" on public.schedule_types for delete to authenticated
  using (public.is_in_family(family_id));

-- 6) MEMBER_SCHEDULE_TYPES policies (join table)
drop policy if exists "all member_schedule_types" on public.member_schedule_types;

create policy "all member_schedule_types" on public.member_schedule_types for all to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_id and public.is_in_family(m.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id and public.is_in_family(m.family_id)
    )
  );

-- 7) SCHEDULE_ENTRIES policies
drop policy if exists "all schedule_entries" on public.schedule_entries;

create policy "all schedule_entries" on public.schedule_entries for all to authenticated
  using (public.is_in_family(family_id))
  with check (public.is_in_family(family_id));

-- 8) INVITES policies
drop policy if exists "all invites" on public.invites;

create policy "all invites" on public.invites for all to authenticated
  using (public.is_in_family(family_id))
  with check (public.is_in_family(family_id));

-- =====================================================
-- DIAGNOSTIC — run these to verify (selecting after the script
-- is applied while logged in as your user from the Supabase UI
-- won't return what the app sees because UI runs as supabase_admin).
-- To verify within the app, just try deleting a member again.
-- =====================================================
-- select public.user_family_ids();
-- select public.is_in_family('<your-family-uuid>');
