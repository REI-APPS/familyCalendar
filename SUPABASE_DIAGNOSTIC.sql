-- =====================================================
-- DIAGNOSTIC QUERIES FOR DELETE RLS ISSUE
-- Run these in Supabase SQL Editor while logged in as your app user
-- =====================================================

-- 1) Check if RLS is enabled on tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('members', 'schedule_types', 'families')
ORDER BY tablename;

-- 2) List ALL current policies on members table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'members'
ORDER BY policyname;

-- 3) List ALL current policies on schedule_types table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'schedule_types'
ORDER BY policyname;

-- 4) Check function definitions and ownership
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  r.rolname as owner,
  r.rolbypassrls as owner_has_bypassrls,
  p.prosecdef as is_security_definer,
  l.lanname as language,
  p.provolatile as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('is_in_family', 'user_family_ids')
ORDER BY p.proname;

-- 5) Check current user and their privileges
SELECT 
  current_user as current_role,
  session_user as session_role,
  rolbypassrls as has_bypassrls
FROM pg_roles
WHERE rolname = current_user;

-- 6) Test the is_in_family function directly
-- Replace <your-family-uuid> with actual family ID
-- SELECT public.is_in_family('<your-family-uuid>'::uuid);

-- 7) Test user_family_ids function
-- SELECT * FROM public.user_family_ids();

-- 8) Check what auth.uid() returns
-- SELECT auth.uid();

-- 9) Verify member exists and belongs to user
-- SELECT id, family_id, user_id, name 
-- FROM public.members 
-- WHERE user_id = auth.uid();

-- 10) Test DELETE with RETURNING to see what RLS sees
-- DO NOT RUN THIS - just shows the pattern
-- DELETE FROM public.members 
-- WHERE id = '<member-id-to-delete>'
-- RETURNING *;

