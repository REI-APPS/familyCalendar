-- =====================================================
-- AGENDA DA FAMÍLIA - Supabase Schema
-- Execute this in Supabase SQL Editor
-- =====================================================

create extension if not exists "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

create table if not exists public.families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  color text default '#C8B6FF',
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_types (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  color text default '#A2D2FF',
  created_at timestamptz not null default now(),
  unique (family_id, code)
);

create table if not exists public.member_schedule_types (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.members(id) on delete cascade,
  schedule_type_id uuid not null references public.schedule_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, schedule_type_id)
);

create table if not exists public.schedule_entries (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  schedule_type_id uuid not null references public.schedule_types(id) on delete cascade,
  entry_date date not null,
  period text not null default 'all',
  notes text,
  created_at timestamptz not null default now(),
  unique (family_id, member_id, entry_date, period)
);

create table if not exists public.invites (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_members_family on public.members(family_id);
create index if not exists idx_members_user on public.members(user_id);
create index if not exists idx_entries_family_date on public.schedule_entries(family_id, entry_date);

-- =====================================================
-- ENABLE RLS
-- =====================================================
alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.schedule_types enable row level security;
alter table public.member_schedule_types enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.invites enable row level security;

-- =====================================================
-- HELPER FUNCTION (avoids RLS recursion on members)
-- =====================================================
create or replace function public.user_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.members where user_id = auth.uid()
$$;

-- =====================================================
-- POLICIES: families
-- =====================================================
drop policy if exists "view own families" on public.families;
create policy "view own families" on public.families for select to authenticated
  using (id in (select public.user_family_ids()) or created_by = auth.uid());

drop policy if exists "create families" on public.families;
create policy "create families" on public.families for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "update own families" on public.families;
create policy "update own families" on public.families for update to authenticated
  using (id in (select public.user_family_ids()));

-- =====================================================
-- POLICIES: members
-- =====================================================
drop policy if exists "view members of own family" on public.members;
create policy "view members of own family" on public.members for select to authenticated
  using (family_id in (select public.user_family_ids()) or user_id = auth.uid());

drop policy if exists "insert members own family" on public.members;
create policy "insert members own family" on public.members for insert to authenticated
  with check (
    family_id in (select public.user_family_ids())
    or exists (select 1 from public.families f where f.id = family_id and f.created_by = auth.uid())
    or user_id = auth.uid()
  );

drop policy if exists "update members own family" on public.members;
create policy "update members own family" on public.members for update to authenticated
  using (family_id in (select public.user_family_ids()));

drop policy if exists "delete members own family" on public.members;
create policy "delete members own family" on public.members for delete to authenticated
  using (family_id in (select public.user_family_ids()));

-- =====================================================
-- POLICIES: schedule_types
-- =====================================================
drop policy if exists "select schedule_types" on public.schedule_types;
create policy "select schedule_types" on public.schedule_types for select to authenticated
  using (family_id in (select public.user_family_ids()));

drop policy if exists "insert schedule_types" on public.schedule_types;
create policy "insert schedule_types" on public.schedule_types for insert to authenticated
  with check (family_id in (select public.user_family_ids()));

drop policy if exists "update schedule_types" on public.schedule_types;
create policy "update schedule_types" on public.schedule_types for update to authenticated
  using (family_id in (select public.user_family_ids()));

drop policy if exists "delete schedule_types" on public.schedule_types;
create policy "delete schedule_types" on public.schedule_types for delete to authenticated
  using (family_id in (select public.user_family_ids()));

-- =====================================================
-- POLICIES: member_schedule_types
-- =====================================================
drop policy if exists "all member_schedule_types" on public.member_schedule_types;
create policy "all member_schedule_types" on public.member_schedule_types for all to authenticated
  using (exists (select 1 from public.members m where m.id = member_id and m.family_id in (select public.user_family_ids())))
  with check (exists (select 1 from public.members m where m.id = member_id and m.family_id in (select public.user_family_ids())));

-- =====================================================
-- POLICIES: schedule_entries
-- =====================================================
drop policy if exists "all schedule_entries" on public.schedule_entries;
create policy "all schedule_entries" on public.schedule_entries for all to authenticated
  using (family_id in (select public.user_family_ids()))
  with check (family_id in (select public.user_family_ids()));

-- =====================================================
-- POLICIES: invites
-- =====================================================
drop policy if exists "all invites" on public.invites;
create policy "all invites" on public.invites for all to authenticated
  using (family_id in (select public.user_family_ids()))
  with check (family_id in (select public.user_family_ids()));

-- =====================================================
-- SEED FUNCTION: create family with default users + types
-- =====================================================
create or replace function public.create_family_with_defaults(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fam_id uuid;
  m1_id uuid; m2_id uuid; m3_id uuid;
  t_inf uuid; t_casa uuid; t_manha uuid; t_tarde uuid; t_office uuid; t_homeoffice uuid;
begin
  insert into public.families(name, created_by) values (family_name, auth.uid()) returning id into fam_id;

  insert into public.members(family_id, user_id, name, color, role)
    values (fam_id, auth.uid(), 'Owner', '#FF8FA3', 'owner');

  insert into public.members(family_id, name, color) values (fam_id, 'User1', '#C8B6FF') returning id into m1_id;
  insert into public.members(family_id, name, color) values (fam_id, 'User2', '#B9FBC0') returning id into m2_id;
  insert into public.members(family_id, name, color) values (fam_id, 'User3', '#A2D2FF') returning id into m3_id;

  insert into public.schedule_types(family_id, code, name, description, color) values
    (fam_id, 'INF', 'Infantário', 'No infantário', '#FFD6A5') returning id into t_inf;
  insert into public.schedule_types(family_id, code, name, description, color) values
    (fam_id, 'CASA', 'Casa', 'Em casa', '#CAFFBF') returning id into t_casa;
  insert into public.schedule_types(family_id, code, name, description, color) values
    (fam_id, 'MANHA', 'Manhã', 'Período da manhã', '#FFADAD') returning id into t_manha;
  insert into public.schedule_types(family_id, code, name, description, color) values
    (fam_id, 'TARDE', 'Tarde', 'Período da tarde', '#FDFFB6') returning id into t_tarde;
  insert into public.schedule_types(family_id, code, name, description, color) values
    (fam_id, 'OFFICE', 'Office', 'No escritório', '#A0C4FF') returning id into t_office;
  insert into public.schedule_types(family_id, code, name, description, color) values
    (fam_id, 'HOME', 'Home Office', 'Trabalho em casa', '#BDB2FF') returning id into t_homeoffice;

  -- Assignments
  insert into public.member_schedule_types(member_id, schedule_type_id) values
    (m1_id, t_inf), (m1_id, t_casa),
    (m2_id, t_manha), (m2_id, t_tarde),
    (m3_id, t_office), (m3_id, t_homeoffice);

  return fam_id;
end;
$$;

grant execute on function public.create_family_with_defaults(text) to authenticated;
grant execute on function public.user_family_ids() to authenticated;

-- =====================================================
-- REALTIME
-- =====================================================
alter publication supabase_realtime add table public.schedule_entries;
