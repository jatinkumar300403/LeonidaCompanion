import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/env.client";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | null = null;

/**
 * The browser Supabase client (publishable key, the user's own session cookies). One instance per
 * tab. Returns null when Supabase isn't configured, so callers hide their feature.
 */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) return null;
  client ??= createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
  return client;
}
