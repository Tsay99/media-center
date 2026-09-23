import { createClient } from "@supabase/supabase-js";
import type { AppState, PersonalTask } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL?.trim() ?? "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export async function loadWorkspaceState(): Promise<AppState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("workspace_state").select("state").eq("id", "default").maybeSingle();
  if (error) throw error;
  return (data?.state as AppState | undefined) ?? null;
}

export async function signInOwner(password: string) {
  if (!supabase || !ownerEmail) throw new Error("Не задан email владельца Supabase");
  const { data, error } = await supabase.auth.signInWithPassword({ email: ownerEmail, password });
  if (error) throw error;
  return data.user;
}

export async function getOwnerSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOutOwner() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function saveWorkspaceState(state: AppState): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("workspace_state").upsert({ id: "default", state, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw error;
}

function taskFromRow(row: Record<string, unknown>): PersonalTask {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: typeof row.description === "string" ? row.description : undefined,
    dueDate: String(row.due_date ?? ""),
    dueTime: typeof row.due_time === "string" ? row.due_time : undefined,
    status: row.status === "in_progress" || row.status === "completed" ? row.status : "todo",
    priority: row.priority === "low" || row.priority === "high" ? row.priority : "medium",
    ownerId: typeof row.owner_id === "string" ? row.owner_id : undefined,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function loadPersonalTasks(): Promise<PersonalTask[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("personal_tasks").select("*").order("due_date", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => taskFromRow(row as Record<string, unknown>));
}

export async function savePersonalTasks(tasks: PersonalTask[]): Promise<void> {
  if (!supabase) return;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const ownerId = sessionData.session?.user.id;
  if (!ownerId) throw new Error("Необходима авторизация editor");

  const { error: deleteError } = await supabase.from("personal_tasks").delete().eq("owner_id", ownerId);
  if (deleteError) throw deleteError;
  if (!tasks.length) return;
  const rows = tasks.map((task) => ({
    id: task.id,
    owner_id: ownerId,
    title: task.title,
    description: task.description ?? null,
    due_date: task.dueDate,
    due_time: task.dueTime ?? null,
    status: task.status,
    priority: task.priority,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }));
  const { error: insertError } = await supabase.from("personal_tasks").insert(rows);
  if (insertError) throw insertError;
}
