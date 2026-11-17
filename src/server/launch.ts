import "server-only";
import { unstable_cache } from "next/cache";
import { LAUNCH_AT } from "@/config/site";
import { serverLaunchHint } from "@/lib/launch";
import { EMPTY_LAUNCH_FACTS, parseStoredLaunchFacts, type LaunchFacts } from "@/lib/validation/launch-facts";
import { SITE_SETTINGS_TAG } from "@/server/articles/cache-tags";
import { getPublicSupabase } from "@/server/supabase/public";

export const LAUNCH_FACTS_TAG = "launch-facts";

/** site_settings.launch_facts (SPEC §4 Launch Hub), cached; the empty skeleton when unset. */
export const getLaunchFacts = unstable_cache(
  async (): Promise<LaunchFacts> => {
    const supabase = getPublicSupabase();
    if (!supabase) return EMPTY_LAUNCH_FACTS;
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "launch_facts")
      .maybeSingle();
    if (error) {
      console.error("[launch] facts read failed:", error.code, error.message);
      return EMPTY_LAUNCH_FACTS;
    }
    return parseStoredLaunchFacts(data?.value);
  },
  ["site-settings:launch-facts"],
  { tags: [SITE_SETTINGS_TAG, LAUNCH_FACTS_TAG], revalidate: 300 },
);

/**
 * The launch moment CountdownOrStatus counts to: an official instant from launch_facts when the
 * admin has set one, otherwise LAUNCH_AT as local midnight (D-020).
 */
export async function getLaunchAt(): Promise<string> {
  const facts = await getLaunchFacts();
  return facts.release_at ?? LAUNCH_AT;
}

/**
 * What CountdownOrStatus can safely render on the server (before the viewer's time zone is
 * known). Read per render, so ISR pages flip to "out" on their next regeneration after launch.
 */
export async function getLaunchHint(): Promise<"upcoming" | "out" | "unknown"> {
  const launchAt = await getLaunchAt();
  if (launchAt !== LAUNCH_AT) return Date.now() >= Date.parse(launchAt) ? "out" : "upcoming";
  return serverLaunchHint(Date.now(), LAUNCH_AT);
}
