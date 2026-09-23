-- Общая рабочая область для одного владельца и публичного гостевого просмотра.
-- Запустите после database/001_initial_schema.sql в Supabase SQL Editor.
-- Перед запуском замените OWNER_EMAIL на email, который будет создан в Supabase Auth.

create table if not exists public.workspace_members (
  email text primary key,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default now()
);

insert into public.workspace_members (email, role)
values ('OWNER_EMAIL', 'owner')
on conflict (email) do nothing;

create table if not exists public.workspace_state (
  id text primary key check (id = 'default'),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace_members enable row level security;
alter table public.workspace_state enable row level security;

revoke all on table public.workspace_members from anon, authenticated;
revoke all on table public.workspace_state from anon, authenticated;
grant select on table public.workspace_state to anon, authenticated;
grant insert, update on table public.workspace_state to authenticated;

create or replace function public.is_workspace_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'owner'
  );
$$;

drop policy if exists "public can read shared workspace" on public.workspace_state;
create policy "public can read shared workspace"
  on public.workspace_state
  for select
  to anon, authenticated
  using (id = 'default');

drop policy if exists "owner can create shared workspace" on public.workspace_state;
create policy "owner can create shared workspace"
  on public.workspace_state
  for insert
  to authenticated
  with check (id = 'default' and public.is_workspace_owner());

drop policy if exists "owner can update shared workspace" on public.workspace_state;
create policy "owner can update shared workspace"
  on public.workspace_state
  for update
  to authenticated
  using (public.is_workspace_owner())
  with check (public.is_workspace_owner() and id = 'default');

revoke all on function public.is_workspace_owner() from public, anon, authenticated;
grant execute on function public.is_workspace_owner() to authenticated;
