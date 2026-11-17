/**
 * `pnpm seed:dev`: upserts 3 [SAMPLE] DRAFT articles per type into the DEV project (Prompt 3).
 * Drafts never show on public pages; they exist to try the admin list and editor. Refuses to run
 * against anything but DEV (scripts/lib/dev-env.mjs) and never in production.
 */
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./lib/dev-env.mjs";
import { SAMPLE_ARTICLES } from "./lib/sample-articles.mjs";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  console.error("[seed-dev] Refusing to run in production.");
  process.exit(1);
}

const env = loadDevEnv({ requireSecret: true });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await admin.from("articles").upsert(SAMPLE_ARTICLES, { onConflict: "type,slug" });
if (error) {
  console.error(`[seed-dev] ${error.message}`);
  process.exit(1);
}
console.log(`[seed-dev] upserted ${SAMPLE_ARTICLES.length} [SAMPLE] draft articles on DEV.`);
