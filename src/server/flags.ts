import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { SITE_SETTINGS_TAG } from "@/server/articles/cache-tags";
import { getPublicSupabase } from "@/server/supabase/public";

/** Feature flags (SPEC §10). Stored in site_settings under the key `flags` (D-018). */
export type Flags = {
  FEATURE_ONLINE: boolean;
  FEATURE_ADS: boolean;
  FEATURE_ASK_ANON: boolean;
  MAINTENANCE_MODE: boolean;
};

export const DEFAULT_FLAGS: Flags = {
  FEATURE_ONLINE: false,
  FEATURE_ADS: false,
  FEATURE_ASK_ANON: false,
  MAINTENANCE_MODE: false,
};

const flagsSchema = z.object({
  FEATURE_ONLINE: z.boolean().catch(false),
  FEATURE_ADS: z.boolean().catch(false),
  FEATURE_ASK_ANON: z.boolean().catch(false),
  MAINTENANCE_MODE: z.boolean().catch(false),
});

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
