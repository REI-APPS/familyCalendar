-- =====================================================
-- 👥 FAMILY USERS — listar e remover utilizadores
-- =====================================================

-- Funcao RPC: lista utilizadores autenticados de uma familia (admin only)
create or replace function public.list_family_users(fid uuid)
returns table(user_id uuid, email text, role text, member_id uuid, member_name text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  is_admin boolean;
begin
  -- Verifica que o caller pertence a esta familia
  if not public.is_in_family(fid) then
    raise exception 'Sem permissão';
  end if;

  return query
    select m.user_id, u.email::text, m.role, m.id as member_id, m.name as member_name
    from public.members m
    left join auth.users u on u.id = m.user_id
    where m.family_id = fid
      and m.user_id is not null
    order by m.created_at;
end;
$$;

alter function public.list_family_users(uuid) owner to postgres;
revoke all on function public.list_family_users(uuid) from public;
grant execute on function public.list_family_users(uuid) to authenticated;


-- Funcao RPC: admin remove um utilizador da familia
-- Apaga o membro + entradas em cascade. NAO apaga a conta auth.users
-- (apenas a associacao a esta familia). Se quiser apagar a propria conta,
-- usar delete_my_account.
create or replace function public.admin_remove_family_user(fid uuid, target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
  rows_deleted integer;
begin
  select role into caller_role
    from public.members
    where family_id = fid and user_id = auth.uid();

  if caller_role is null then
    raise exception 'Sem permissão (não és membro)';
  end if;
  if caller_role <> 'owner' then
    raise exception 'Apenas o owner pode remover utilizadores';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Não podes remover-te a ti próprio. Usa "Apagar conta".';
  end if;

  delete from public.members
    where family_id = fid and user_id = target_user_id;
  get diagnostics rows_deleted = row_count;
  return rows_deleted > 0;
end;
$$;

alter function public.admin_remove_family_user(uuid, uuid) owner to postgres;
revoke all on function public.admin_remove_family_user(uuid, uuid) from public;
grant execute on function public.admin_remove_family_user(uuid, uuid) to authenticated;


-- =====================================================
-- 🔔 ALERTS — notificações de alterações nos próximos 14 dias
-- =====================================================
-- Modelo: trigger automatico em schedule_entries e tasks regista uma alteracao.
-- Os utilizadores tem um "last_seen_change_at" timestamp; ao abrir a app
-- buscam alteracoes mais recentes que esse timestamp.
-- =====================================================

create table if not exists public.change_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  entry_date date not null,
  kind text not null check (kind in ('schedule_entry', 'task')),
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  description text,
  created_at timestamptz default now()
);

create index if not exists change_log_family_created_idx on public.change_log(family_id, created_at desc);

alter table public.change_log enable row level security;
drop policy if exists "view change_log" on public.change_log;
create policy "view change_log" on public.change_log for select to authenticated
  using (public.is_in_family(family_id));

-- Tabela per-user: ultimo timestamp visto
create table if not exists public.user_changes_seen (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz default now()
);
alter table public.user_changes_seen enable row level security;
drop policy if exists "user changes seen own" on public.user_changes_seen;
create policy "user changes seen own" on public.user_changes_seen for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- Trigger generico para schedule_entries
create or replace function public.log_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  edate date;
  fid uuid;
  act text;
begin
  if (tg_op = 'DELETE') then
    edate := old.entry_date;
    fid := old.family_id;
    act := 'delete';
  else
    edate := new.entry_date;
    fid := new.family_id;
    act := lower(tg_op);
  end if;

  -- Apenas regista alteracoes nos proximos 14 dias
  if edate >= current_date and edate <= (current_date + interval '14 days') then
    insert into public.change_log(family_id, entry_date, kind, action, changed_by, description)
    values (fid, edate, 'schedule_entry', act, auth.uid(), to_char(edate, 'YYYY-MM-DD'));
  end if;
  return coalesce(new, old);
end;
$$;
alter function public.log_schedule_change() owner to postgres;

drop trigger if exists trg_log_schedule on public.schedule_entries;
create trigger trg_log_schedule
  after insert or update or delete on public.schedule_entries
  for each row execute procedure public.log_schedule_change();


-- Trigger para tasks
create or replace function public.log_task_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  edate date;
  fid uuid;
  act text;
  title text;
begin
  if (tg_op = 'DELETE') then
    edate := old.entry_date; fid := old.family_id; act := 'delete'; title := old.title;
  else
    edate := new.entry_date; fid := new.family_id; act := lower(tg_op); title := new.title;
  end if;
  if edate >= current_date and edate <= (current_date + interval '14 days') then
    insert into public.change_log(family_id, entry_date, kind, action, changed_by, description)
    values (fid, edate, 'task', act, auth.uid(), title);
  end if;
  return coalesce(new, old);
end;
$$;
alter function public.log_task_change() owner to postgres;
drop trigger if exists trg_log_task on public.tasks;
create trigger trg_log_task
  after insert or update or delete on public.tasks
  for each row execute procedure public.log_task_change();


-- RPC para o cliente: devolve alteracoes nao vistas e atualiza last_seen
create or replace function public.get_unseen_changes()
returns setof public.change_log
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  last_seen timestamptz;
begin
  if uid is null then return; end if;

  select last_seen_at into last_seen from public.user_changes_seen where user_id = uid;
  if last_seen is null then
    -- Primeira vez: marca agora e nao mostra historico
    insert into public.user_changes_seen(user_id, last_seen_at) values (uid, now())
      on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
    return;
  end if;

  return query
    select c.* from public.change_log c
    where c.created_at > last_seen
      and c.changed_by is distinct from uid     -- nao mostrar as proprias alteracoes
      and c.entry_date >= current_date
      and c.entry_date <= (current_date + interval '14 days')
      and c.family_id in (select public.user_family_ids())
    order by c.created_at desc
    limit 50;

  -- Atualiza last_seen
  update public.user_changes_seen set last_seen_at = now() where user_id = uid;
end;
$$;
alter function public.get_unseen_changes() owner to postgres;
grant execute on function public.get_unseen_changes() to authenticated;
