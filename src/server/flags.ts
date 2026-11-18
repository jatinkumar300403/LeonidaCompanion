import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { SITE_SETTINGS_TAG } from "@/server/articles/cache-tags";
import { getPublicSupabase } from "@/server/supabase/public";

/**
 * Feature flags (SPEC §10). Stored in site_settings under the key `flags` (D-018).
 * SHADOW_HOLD_NEW_USERS is the Phase 6 spam-attack switch (D-085).
 */
export type Flags = {
  FEATURE_ONLINE: boolean;
  FEATURE_ADS: boolean;
  FEATURE_ASK_ANON: boolean;
  MAINTENANCE_MODE: boolean;
  SHADOW_HOLD_NEW_USERS: boolean;
};

export const FLAG_KEYS = [
  "FEATURE_ONLINE",
  "FEATURE_ADS",
  "FEATURE_ASK_ANON",
  "MAINTENANCE_MODE",
  "SHADOW_HOLD_NEW_USERS",
] as const satisfies readonly (keyof Flags)[];

export const DEFAULT_FLAGS: Flags = {
  FEATURE_ONLINE: false,
  FEATURE_ADS: false,
  FEATURE_ASK_ANON: false,
  MAINTENANCE_MODE: false,
  SHADOW_HOLD_NEW_USERS: false,
};

const flagsSchema = z.object({
  FEATURE_ONLINE: z.boolean().catch(false),
  FEATURE_ADS: z.boolean().catch(false),
  FEATURE_ASK_ANON: z.boolean().catch(false),
  MAINTENANCE_MODE: z.boolean().catch(false),
  SHADOW_HOLD_NEW_USERS: z.boolean().catch(false),
});

/** MAINTENANCE_MODE pauses members' writes; staff keep working (D-086). */
export const MAINTENANCE_MESSAGE = "The site is in maintenance mode, so posting is paused for a little while.";

export function writesPausedFor(flags: Flags, role: string): boolean {
  return flags.MAINTENANCE_MODE && role !== "mod" && role !== "admin";
}

/** Stored flags, with every missing or malformed one at its default (off). */
export function parseFlags(value: unknown): Flags {
  const parsed = flagsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : DEFAULT_FLAGS;
}

/** Cached read of site_settings.flags (tag "site-settings"). Defaults when Supabase is missing or errors. */
export const getFlags = unstable_cache(
  async (): Promise<Flags> => {
    const supabase = getPublicSupabase();
    if (!supabase) return DEFAULT_FLAGS;
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "flags").maybeSingle();
    if (error) {
      console.error("[flags] read failed; using defaults:", error.code, error.message);
      return DEFAULT_FLAGS;
    }
    return parseFlags(data?.value);
  },
  ["site-settings:flags"],
  { tags: [SITE_SETTINGS_TAG], revalidate: 300 },
);
