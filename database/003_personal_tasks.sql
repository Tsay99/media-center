-- Personal task workspace. Run after 001_initial_schema.sql and 002_shared_workspace.sql.
-- Tasks are intentionally separate from workspace_state: the shared content plan is public-read,
-- while manual tasks belong only to the authenticated editor account.
create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  due_date date not null,
  due_time time,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_tasks_owner_due_idx on public.personal_tasks(owner_id, due_date);
create index if not exists personal_tasks_owner_status_idx on public.personal_tasks(owner_id, status);

alter table public.personal_tasks enable row level security;

drop policy if exists "editor reads own personal tasks" on public.personal_tasks;
create policy "editor reads own personal tasks"
  on public.personal_tasks for select
  to authenticated
  using (auth.uid() = owner_id and public.is_workspace_owner());

drop policy if exists "editor creates own personal tasks" on public.personal_tasks;
create policy "editor creates own personal tasks"
  on public.personal_tasks for insert
  to authenticated
  with check (auth.uid() = owner_id and public.is_workspace_owner());

drop policy if exists "editor updates own personal tasks" on public.personal_tasks;
create policy "editor updates own personal tasks"
  on public.personal_tasks for update
  to authenticated
  using (auth.uid() = owner_id and public.is_workspace_owner())
  with check (auth.uid() = owner_id and public.is_workspace_owner());

drop policy if exists "editor deletes own personal tasks" on public.personal_tasks;
create policy "editor deletes own personal tasks"
  on public.personal_tasks for delete
  to authenticated
  using (auth.uid() = owner_id and public.is_workspace_owner());
