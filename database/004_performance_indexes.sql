-- Query-aligned indexes for the current Supabase access patterns.
-- Run after 002_shared_workspace.sql and 003_personal_tasks.sql.

-- The owner check normalizes email with lower(), so use a matching expression index.
create index if not exists workspace_members_email_lower_idx
  on public.workspace_members (lower(email));

-- Tasks are filtered by owner_id and sorted by due_date, then created_at.
create index if not exists personal_tasks_owner_due_created_idx
  on public.personal_tasks (owner_id, due_date asc, created_at desc);
