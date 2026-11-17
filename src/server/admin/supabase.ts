import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/env.client";
import { env } from "@/env";
import type { Database } from "@/types/database";

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client: bypasses RLS. CLAUDE.md: only `src/server/admin/*`, cron routes
 * and scripts may use it, and never with input that hasn't been authorised first.
 */
export function getAdminSupabase(): SupabaseClient<Database> {
  const url = publicEnv.supabaseUrl;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("The Supabase secret key is not configured (SUPABASE_SECRET_KEY).");
  adminClient ??= createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}
