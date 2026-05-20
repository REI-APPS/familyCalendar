-- =====================================================
-- 🔧 FIX V3 — DEFINITIVE: Break RLS recursion properly
-- Execute this in Supabase SQL Editor
-- =====================================================
--
-- ROOT CAUSE (after deep analysis):
--  V2's is_in_family() is SECURITY DEFINER owned by postgres,
--  BUT when the SELECT policy on members calls is_in_family(),
--  and is_in_family() queries members, PostgreSQL may still
--  apply RLS if the function is inlined or if there's a subtle
--  recursion detection issue.
--
-- THE REAL PROBLEM:
--  In V2, both SELECT and DELETE policies on members call
--  is_in_family(), which queries members. This creates a
--  circular dependency that PostgreSQL's RLS recursion detection
--  catches, causing it to return 0 rows.
--
-- THE SOLUTION:
--  Use a PRIVATE schema with a helper function that PostgreSQL
--  definitely won't inline, and ensure the function owner has
--  BYPASSRLS. Then rewrite policies to use this helper.
--
-- ALTERNATIVE SIMPLER APPROACH (what we'll use):
--  Keep is_in_family() but mark it as LEAKPROOF and ensure it's
--  truly not inlined. Use plpgsql with explicit SECURITY DEFINER.
--  Most importantly: ensure postgres role has BYPASSRLS (it does
--  in Supabase by default).
-- =====================================================

-- Step 1: Drop and recreate is_in_family with explicit settings
drop function if exists public.is_in_family(uuid) cascade;

create or replace function public.is_in_family(fid uuid)
returns boolean
language plpgsql
stable
security definer
-- CRITICAL: Set search_path to prevent search path attacks
set search_path = public, pg_temp
as $$
declare
  result boolean;
begin
  -- This SELECT runs as the function owner (postgres), which has
  -- BYPASSRLS in Supabase. Therefore, it should NOT trigger RLS
  -- policies on the members table.
  select exists(
    select 1 
    from public.members
    where family_id = fid 
      and user_id = auth.uid()
  ) into result;
  
  return coalesce(result, false);
end;
$$;

-- CRITICAL: Ensure owner is postgres (has BYPASSRLS)
alter function public.is_in_family(uuid) owner to postgres;
grant execute on function public.is_in_family(uuid) to authenticated;

-- Optional: Mark as LEAKPROOF if you're confident it doesn't leak info
-- This helps the planner optimize but requires superuser
-- ALTER FUNCTION public.is_in_family(uuid) LEAKPROOF;

-- Step 2: Recreate user_family_ids similarly
drop function if exists public.user_family_ids() cascade;

create or replace function public.user_family_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- Runs as postgres, bypasses RLS
  return query
    select family_id 
    from public.members 
    where user_id = auth.uid();
end;
$$;

alter function public.user_family_ids() owner to postgres;
grant execute on function public.user_family_ids() to authenticated;

-- =====================================================
-- MEMBERS TABLE POLICIES
-- =====================================================

-- SELECT: Allow viewing all members in families the user belongs to
drop policy if exists "view members of own family" on public.members;

create policy "view members of own family" on public.members 
  for select to authenticated
  using (
    -- Allow if this member record IS the user
    user_id = auth.uid()
    -- OR if the user belongs to this family
    or public.is_in_family(family_id)
  );

-- DELETE: Allow deleting members in families the user belongs to
drop policy if exists "delete members own family" on public.members;

create policy "delete members own family" on public.members 
  for delete to authenticated
  using (public.is_in_family(family_id));

-- INSERT: Allow inserting members into families the user belongs to
drop policy if exists "insert members own family" on public.members;

create policy "insert members own family" on public.members 
  for insert to authenticated
  with check (
    public.is_in_family(family_id)
    or exists (
      select 1 from public.families f 
      where f.id = family_id and f.created_by = auth.uid()
    )
    or user_id = auth.uid()
  );

-- UPDATE: Allow updating members in families the user belongs to
drop policy if exists "update members own family" on public.members;

create policy "update members own family" on public.members 
  for update to authenticated
  using (public.is_in_family(family_id));

-- =====================================================
-- SCHEDULE_TYPES TABLE POLICIES
-- =====================================================

drop policy if exists "select schedule_types" on public.schedule_types;
create policy "select schedule_types" on public.schedule_types 
  for select to authenticated
  using (public.is_in_family(family_id));

drop policy if exists "insert schedule_types" on public.schedule_types;
create policy "insert schedule_types" on public.schedule_types 
  for insert to authenticated
  with check (public.is_in_family(family_id));

drop policy if exists "update schedule_types" on public.schedule_types;
create policy "update schedule_types" on public.schedule_types 
  for update to authenticated
  using (public.is_in_family(family_id));

drop policy if exists "delete schedule_types" on public.schedule_types;
create policy "delete schedule_types" on public.schedule_types 
  for delete to authenticated
  using (public.is_in_family(family_id));

-- =====================================================
-- OTHER TABLE POLICIES
-- =====================================================

drop policy if exists "view own families" on public.families;
create policy "view own families" on public.families 
  for select to authenticated
  using (public.is_in_family(id) or created_by = auth.uid());

drop policy if exists "create families" on public.families;
create policy "create families" on public.families 
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "update own families" on public.families;
create policy "update own families" on public.families 
  for update to authenticated
  using (public.is_in_family(id));

drop policy if exists "delete own families" on public.families;
create policy "delete own families" on public.families 
  for delete to authenticated
  using (created_by = auth.uid());

drop policy if exists "all member_schedule_types" on public.member_schedule_types;
create policy "all member_schedule_types" on public.member_schedule_types 
  for all to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_id 
        and public.is_in_family(m.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id 
        and public.is_in_family(m.family_id)
    )
  );

drop policy if exists "all schedule_entries" on public.schedule_entries;
create policy "all schedule_entries" on public.schedule_entries 
  for all to authenticated
  using (public.is_in_family(family_id))
  with check (public.is_in_family(family_id));

drop policy if exists "all invites" on public.invites;
create policy "all invites" on public.invites 
  for all to authenticated
  using (public.is_in_family(family_id))
  with check (public.is_in_family(family_id));

-- =====================================================
-- WHY THIS SHOULD WORK (but V2 didn't)
-- =====================================================
--
-- The key difference from V2:
-- 1. Added explicit `set search_path = public, pg_temp` for security
-- 2. Kept plpgsql (prevents inlining)
-- 3. Ensured owner is postgres (has BYPASSRLS)
--
-- The recursion issue in V2 might have been caused by:
-- - PostgreSQL's planner still detecting the circular dependency
-- - The postgres role not actually having BYPASSRLS (unlikely)
-- - A subtle issue with how Supabase's PostgREST evaluates policies
--
-- IF THIS STILL DOESN'T WORK, the nuclear option is to:
-- 1. Create a PRIVATE schema
-- 2. Create a membership cache table with NO RLS
-- 3. Use triggers to keep it in sync
-- 4. Query that instead of members
--
-- OR use an RPC function for deletes that bypasses RLS entirely.
-- =====================================================

-- =====================================================
-- DIAGNOSTIC QUERIES
-- =====================================================

-- 1. Verify postgres role has BYPASSRLS
-- SELECT rolname, rolbypassrls, rolsuper
-- FROM pg_roles
-- WHERE rolname = 'postgres';

-- 2. Check function ownership
-- SELECT 
--   p.proname,
--   r.rolname as owner,
--   r.rolbypassrls,
--   p.prosecdef as is_security_definer,
--   l.lanname as language,
--   p.provolatile
-- FROM pg_proc p
-- JOIN pg_roles r ON p.proowner = r.oid
-- JOIN pg_language l ON p.prolang = l.oid
-- WHERE p.proname IN ('is_in_family', 'user_family_ids');

-- 3. List all policies on members
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'members';

-- 4. Test is_in_family (replace UUID)
-- SELECT public.is_in_family('your-family-uuid'::uuid);

-- 5. Test DELETE (replace UUID)
-- DELETE FROM public.members WHERE id = 'member-uuid' RETURNING *;

-- =====================================================
-- IF V3 STILL FAILS: RPC WORKAROUND
-- =====================================================
-- If this still doesn't work, use this RPC function as a workaround:
--
-- create or replace function public.delete_member(member_id_to_delete uuid)
-- returns json
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- declare
--   member_family_id uuid;
--   deleted_member json;
-- begin
--   -- Get the family_id of the member to delete
--   select family_id into member_family_id
--   from public.members
--   where id = member_id_to_delete;
--
--   -- Check if user has permission (belongs to same family)
--   if not public.is_in_family(member_family_id) then
--     raise exception 'Permission denied';
--   end if;
--
--   -- Delete and return the deleted member
--   delete from public.members
--   where id = member_id_to_delete
--   returning row_to_json(members.*) into deleted_member;
--
--   return deleted_member;
-- end;
-- $$;
--
-- alter function public.delete_member(uuid) owner to postgres;
-- grant execute on function public.delete_member(uuid) to authenticated;
--
-- Then in the app, call:
-- const { data, error } = await supabase.rpc('delete_member', { member_id_to_delete: id });

