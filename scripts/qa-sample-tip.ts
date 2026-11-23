/**
 * `pnpm qa:sample-tip publish|unpublish` (Phase 9): Lighthouse and the JS budget need a real tip
 * page, and DEV only holds [SAMPLE] drafts. `publish` makes `sample-tip-1` public for the audit
 * and prints its path; `unpublish` puts it back to draft. Runs `pnpm seed:dev` first if the sample
 * is missing. DEV only (scripts/lib/dev-env.mjs), never in production.
 */
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./lib/dev-env.mjs";

const SLUG = "sample-tip-1";
const mode = process.argv[2];

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  console.error("[qa-sample-tip] Refusing to run in production.");
  process.exit(1);
}
if (mode !== "publish" && mode !== "unpublish") {
  console.error("Usage: pnpm qa:sample-tip publish|unpublish");
  process.exit(1);
}

const env = loadDevEnv({ requireSecret: true });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing, error: readError } = await admin
  .from("articles")
  .select("id, title, status")
  .eq("type", "tip")
  .eq("slug", SLUG)
  .maybeSingle();
if (readError || !existing) {
  console.error(`[qa-sample-tip] ${readError?.message ?? `No ${SLUG} on DEV; run pnpm seed:dev first.`}`);
  process.exit(1);
}

const update =
  mode === "publish"
    ? { status: "published", published_at: new Date().toISOString() }
    : { status: "draft", published_at: null, pipeline_ran_at: null };
const { error } = await admin.from("articles").update(update).eq("id", existing.id);
if (error) {
  console.error(`[qa-sample-tip] ${error.message}`);
  process.exit(1);
}
console.log(`[qa-sample-tip] ${existing.title} is now ${update.status}: /tips/${SLUG}`);
