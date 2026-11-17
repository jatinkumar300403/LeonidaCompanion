import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/env.client";
import type { Database } from "@/types/database";

let publicClient: SupabaseClient<Database> | null = null;

/**
 * Cookie-less Supabase client that reads as `anon` (D-051). Cached public reads
 * (`unstable_cache`) can't touch cookies, and must never see a signed-in user's view anyway:
 * RLS gives this client exactly what a logged-out visitor may see. Returns null without Supabase.
 */
export function getPublicSupabase(): SupabaseClient<Database> | null {
  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabasePublishableKey;
  if (!url || !key) return null;
  publicClient ??= createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return publicClient;
}
