-- =====================================================
-- 📋 TASKS — tarefas esporádicas (sem membro/tipo)
-- Execute este script no Supabase SQL Editor
-- =====================================================
--
-- As tarefas são notas/eventos pontuais associados a um dia,
-- independentes dos schedule_entries (que requerem member + type).
-- Ex: "Médico às 15h", "Aniversário do João", "Comprar leite".
-- =====================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  entry_date date not null,
  title text not null,
  done boolean default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists tasks_family_date_idx on public.tasks(family_id, entry_date);

alter table public.tasks enable row level security;

drop policy if exists "all tasks" on public.tasks;
create policy "all tasks" on public.tasks for all to authenticated
  using (public.is_in_family(family_id))
  with check (public.is_in_family(family_id));

-- Realtime
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tasks';
  if not found then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;

-- RPC para apagar tarefa (igual padrão do delete_member - bypass RLS)
create or replace function public.delete_task(task_id_to_delete uuid)
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
  select family_id into target_family_id from public.tasks where id = task_id_to_delete;
  if target_family_id is null then
    raise exception 'Tarefa não encontrada';
  end if;

  select exists(select 1 from public.members where family_id = target_family_id and user_id = auth.uid()) into caller_is_member;
  if not coalesce(caller_is_member, false) then
    raise exception 'Sem permissão';
  end if;

  delete from public.tasks where id = task_id_to_delete;
  get diagnostics rows_deleted = row_count;
  return rows_deleted > 0;
end;
$$;

alter function public.delete_task(uuid) owner to postgres;
revoke all on function public.delete_task(uuid) from public;
grant execute on function public.delete_task(uuid) to authenticated;
