"use server";

import { updateTag } from "next/cache";
import { ONLINE_CATEGORY_SLUG } from "@/lib/forum/rules";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import { articleFieldErrors } from "@/lib/validation/article";
import { launchFactsSchema, type LaunchFacts } from "@/lib/validation/launch-facts";
import { flagsInputSchema } from "@/lib/validation/moderation";
import { SITE_SETTINGS_TAG } from "@/server/articles/cache-tags";
import { requireRole } from "@/server/auth/session";
import { FLAG_KEYS, parseFlags, type Flags } from "@/server/flags";
import { FORUM_TAG } from "@/server/forum/cache-tags";
import { LAUNCH_FACTS_TAG } from "@/server/launch";
import { logModerationAction } from "@/server/moderation/log";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type LaunchFactsResult =
  | { ok: true; message: string; facts: LaunchFacts }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** /admin/launch (SPEC §10): saves site_settings.launch_facts as the admin (RLS: admins write). */
export async function saveLaunchFacts(raw: unknown): Promise<LaunchFactsResult> {
  const session = await requireRole("admin", "/admin/launch");
  const limit = await rateLimit("articleWrite", session.userId);
  if (!limit.success) return { ok: false, message: rateLimitMessage(limit.retryAfterSeconds) };

  const parsed = launchFactsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: articleFieldErrors(parsed.error) };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "launch_facts", value: parsed.data }, { onConflict: "key" });
  if (error) {
    console.error("[launch] save failed:", error.code, error.message);
    return { ok: false, message: "We couldn't save the launch facts. Please try again." };
  }
  updateTag(LAUNCH_FACTS_TAG);
  updateTag(SITE_SETTINGS_TAG);
  return { ok: true, message: "Launch facts saved.", facts: parsed.data };
}

// ─── Feature flags (SPEC §10, D-018, D-085, D-086) ──────────────────────────
export type FlagsResult = { ok: true; message: string; flags: Flags } | { ok: false; message: string };

/**
 * /admin/settings: saves site_settings.flags as the admin (RLS: admins write). Turning
 * FEATURE_ONLINE on or off also unlocks or locks the Online forum category (D-042). Logged.
 */
export async function saveFlags(raw: unknown): Promise<FlagsResult> {
  const session = await requireRole("admin", "/admin/settings");
  const limit = await rateLimit("adminSettings", session.userId);
  if (!limit.success) return { ok: false, message: rateLimitMessage(limit.retryAfterSeconds) };
  const parsed = flagsInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "That didn't work. Reload and try again." };
  const flags = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase.from("site_settings").select("value").eq("key", "flags").maybeSingle();
  const before = parseFlags(current?.value);
  const { error } = await supabase.from("site_settings").upsert({ key: "flags", value: flags }, { onConflict: "key" });
  if (error) {
    console.error("[settings] flags save failed:", error.code, error.message);
    return { ok: false, message: "We couldn't save the flags. Please try again." };
  }

  if (before.FEATURE_ONLINE !== flags.FEATURE_ONLINE) {
    const locked = await supabase
      .from("forum_categories")
      .update({ is_locked: !flags.FEATURE_ONLINE })
      .eq("slug", ONLINE_CATEGORY_SLUG);
    if (locked.error) console.error("[settings] Online category lock failed:", locked.error.message);
    updateTag(FORUM_TAG);
  }
  updateTag(SITE_SETTINGS_TAG);

  const changed = FLAG_KEYS.filter((key) => before[key] !== flags[key]);
  if (changed.length > 0) {
    await logModerationAction(supabase, {
      actorId: session.userId,
      action: "flags_update",
      targetType: "site_settings",
      targetId: "flags",
      reason: changed.map((key) => `${key} ${flags[key] ? "on" : "off"}`).join(", "),
    });
  }
  return { ok: true, message: changed.length ? "Flags saved." : "Nothing changed.", flags };
}
