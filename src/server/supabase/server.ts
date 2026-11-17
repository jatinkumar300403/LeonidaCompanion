import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "@/env.client";
import type { Database } from "@/types/database";

export type ServerSupabase = SupabaseClient<Database>;

/**
 * Supabase client for Server Components, Server Actions and route handlers. It acts as the
 * signed-in user (publishable key + session cookies), so RLS applies to everything it does.
 * Server Components can't write cookies; src/proxy.ts refreshes the session before they render.
 */
export async function createSupabaseServerClient(): Promise<ServerSupabase> {
  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabasePublishableKey;
  if (!url || !key) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, which can't set cookies. The proxy refreshes sessions.
        }
      },
    },
  });
}
