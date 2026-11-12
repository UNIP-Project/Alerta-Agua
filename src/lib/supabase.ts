import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseEnv = Partial<Record<"VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY", string>>;

export function hasSupabaseConfig(env: SupabaseEnv = import.meta.env): boolean {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return false;

  const placeholders = ["SEU_PROJETO", "SUA_CHAVE_ANON", "your-project", "your-anon-key"];
  if (placeholders.some((value) => url.includes(value) || anonKey.includes(value))) return false;

  return url.startsWith("http://") || url.startsWith("https://");
}

export function getSupabaseClient(env: SupabaseEnv = import.meta.env): SupabaseClient | null {
  if (!hasSupabaseConfig(env)) return null;

  const url = env.VITE_SUPABASE_URL!;
  const anonKey = env.VITE_SUPABASE_ANON_KEY!;

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = getSupabaseClient();
