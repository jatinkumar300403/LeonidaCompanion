"use server";

import { updateTag } from "next/cache";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import { articleFieldErrors } from "@/lib/validation/article";
import { launchFactsSchema, type LaunchFacts } from "@/lib/validation/launch-facts";
import { SITE_SETTINGS_TAG } from "@/server/articles/cache-tags";
import { requireRole } from "@/server/auth/session";
import { LAUNCH_FACTS_TAG } from "@/server/launch";
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
