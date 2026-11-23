import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/env.client";
import type { Database } from "@/types/database";

let loading: Promise<SupabaseClient<Database> | null> | null = null;

/**
 * The browser Supabase client (publishable key, the user's own session cookies), one per tab.
 * Loaded on demand: every caller reads it after hydration (the header's account slot, votes,
 * notifications), so supabase-js (about 65 KB compressed) stays out of the first-load JS (D-099).
 * Resolves to null when Supabase isn't configured, so callers hide their feature.
 */
export function loadBrowserSupabase(): Promise<SupabaseClient<Database> | null> {
  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabasePublishableKey;
  if (!url || !key) return Promise.resolve(null);
  loading ??= import("@supabase/ssr").then(({ createBrowserClient }) => createBrowserClient<Database>(url, key));
  return loading;
}
