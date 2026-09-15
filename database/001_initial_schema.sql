-- Контент план факт · Supabase PostgreSQL schema
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  title text not null,
  content_type text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'approval' check (status in ('approval', 'shoot', 'shot', 'editing', 'published')),
  planned_shoot_date date,
  planned_shoot_time time,
  actual_shoot_date date,
  planned_publish_date date,
  actual_publish_date date,
  location text,
  participants text,
  script text,
  coauthors text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_approval_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  field_name text not null,
  status text not null default 'undefined' check (status in ('undefined', 'pending', 'approved')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_id, field_name)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  activity_date date not null,
  action text not null,
  minutes integer not null check (minutes > 0),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  platform_id uuid not null references public.platforms(id),
  published_date date not null,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_id, platform_id)
);

create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  totals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month)
);

create table if not exists public.product_monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_plan_id uuid not null references public.monthly_plans(id) on delete cascade,
  product_id uuid not null references public.products(id),
  targets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(monthly_plan_id, product_id)
);

create index if not exists products_user_idx on public.products(user_id);
create index if not exists platforms_user_idx on public.platforms(user_id);
create index if not exists content_items_user_idx on public.content_items(user_id);
create index if not exists content_items_status_idx on public.content_items(status);
create index if not exists content_items_product_idx on public.content_items(product_id);
create index if not exists content_items_type_idx on public.content_items(content_type);
create index if not exists content_items_shoot_date_idx on public.content_items(planned_shoot_date);
create index if not exists content_items_publish_date_idx on public.content_items(planned_publish_date);
create index if not exists activities_date_idx on public.activities(activity_date);
create index if not exists activities_user_idx on public.activities(user_id);
create index if not exists publications_date_idx on public.content_publications(published_date);
create index if not exists publications_platform_idx on public.content_publications(platform_id);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.platforms enable row level security;
alter table public.content_items enable row level security;
alter table public.content_approval_items enable row level security;
alter table public.activities enable row level security;
alter table public.content_publications enable row level security;
alter table public.monthly_plans enable row level security;
alter table public.product_monthly_plans enable row level security;

-- Personal admin data: only the authenticated owner can modify it.
create policy "owner read profiles" on public.profiles for select using (auth.uid() = id);
create policy "owner update profiles" on public.profiles for update using (auth.uid() = id);
create policy "owner manages products" on public.products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner manages platforms" on public.platforms for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner manages content" on public.content_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner manages approvals" on public.content_approval_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner manages activities" on public.activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner manages publications" on public.content_publications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner manages monthly plans" on public.monthly_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner manages product plans" on public.product_monthly_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- For public read-only sharing later, add a dedicated view or anon-safe policy.
-- Do not expose service_role keys in the browser.
