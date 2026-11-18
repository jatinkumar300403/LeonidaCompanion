/**
 * Loads the Prompt 13 launch content (content/launch/) into Supabase as DRAFTS, plus the Launch
 * Hub facts (site_settings.launch_facts). The owner reviews and publishes every draft in the CMS.
 *
 *   node scripts/load-launch-content.ts            create what's missing, leave everything else
 *   node scripts/load-launch-content.ts --dry-run  validate only, write nothing
 *   node scripts/load-launch-content.ts --update   also refresh drafts/in-review rows and the facts
 *
 * Idempotent: an article that already exists (same type, and the same slug or title) is skipped,
 * so re-running never creates duplicates. Published and archived rows are never touched.
 *
 * Validation is the CMS's own: articleInputSchema + publishProblems (so every draft is one click
 * from publishable) and launchFactsSchema. Rows have the same shape saveArticle(null, input,
 * "draft") writes. Writes use the service role because Server Actions need a signed-in request.
 * DEV only (scripts/lib/dev-env.mjs); Phase 11 decides how the same files reach PROD.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv, repoRoot } from "./lib/dev-env.mjs";
import "./lib/src-alias-hooks.mjs";
import type { ArticleInput } from "@/lib/validation/article";
import type { Database } from "@/types/database";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  console.error("[launch-content] Refusing to run in production.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const UPDATE = args.has("--update");
const ADMIN_BASE = "http://localhost:3000";
const PRELAUNCH_LABEL = "Pre-launch tip — will be updated after release";
const OFFICIAL_HOST = /(^|\.)rockstargames\.com$/;

const { articleInputSchema, articleFieldErrors, publishProblems } = await import("@/lib/validation/article");
const { hasLaunchFacts, launchFactsSchema, parseStoredLaunchFacts } = await import("@/lib/validation/launch-facts");
const { isValidSlug } = await import("@/lib/articles/slug");

type ManifestArticle = {
  file: string;
  type: ArticleInput["type"];
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  spoilerLevel?: ArticleInput["spoilerLevel"];
  factStatus?: ArticleInput["factStatus"];
  sources: string[];
};
type Manifest = {
  accessedAt: string;
  sources: Record<string, { title: string; url: string }>;
  articles: ManifestArticle[];
};

const contentDir = join(repoRoot, "content", "launch");
const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(contentDir, file), "utf8")) as T;
const manifest = readJson<Manifest>("manifest.json");

// ── 1. Validate everything before writing anything ──────────────────────────────────────────
const problems: string[] = [];
const inputs: { entry: ManifestArticle; input: ArticleInput }[] = [];

const seenSlugs = new Set<string>();
for (const entry of manifest.articles) {
  const where = `${entry.file}`;
  let body = "";
  try {
    body = readFileSync(join(contentDir, entry.file), "utf8").replace(/\r\n/g, "\n").trim();
  } catch {
    problems.push(`${where}: body file not found`);
    continue;
  }

  const sources = [];
  for (const key of entry.sources) {
    const source = manifest.sources[key];
    if (!source) problems.push(`${where}: unknown source key "${key}"`);
    else sources.push({ title: source.title, url: source.url, accessed_at: manifest.accessedAt });
  }

  const parsed = articleInputSchema.safeParse({
    type: entry.type,
    title: entry.title,
    slug: entry.slug,
    summary: entry.summary,
    body,
    tags: entry.tags,
    spoilerLevel: entry.spoilerLevel ?? "none",
    factStatus: entry.factStatus ?? "",
    sources,
  });
  if (!parsed.success) {
    for (const [field, message] of Object.entries(articleFieldErrors(parsed.error))) {
      problems.push(`${where}: ${field}: ${message}`);
    }
    continue;
  }
  const input = parsed.data;

  for (const [field, message] of Object.entries(publishProblems(input))) {
    problems.push(`${where}: not publishable: ${field}: ${message}`);
  }
  if (!isValidSlug(input.slug)) problems.push(`${where}: invalid slug "${input.slug}"`);
  const key = `${input.type}:${input.slug}`;
  if (seenSlugs.has(key)) problems.push(`${where}: duplicate slug "${input.slug}"`);
  seenSlugs.add(key);
  if (/\[SAMPLE\]/i.test(`${input.title}\n${input.body}`)) problems.push(`${where}: contains [SAMPLE]`);
  if (input.sources.some((source) => !OFFICIAL_HOST.test(new URL(source.url).hostname))) {
    problems.push(`${where}: every source must be an official rockstargames.com page`);
  }
  if (input.type === "fact" && (input.factStatus !== "confirmed" || input.sources.length === 0)) {
    problems.push(`${where}: launch facts must be confirmed with an official source`);
  }
  if (input.type === "tip" && !input.body.includes(PRELAUNCH_LABEL)) {
    problems.push(`${where}: tip is missing the "${PRELAUNCH_LABEL}" label`);
  }
  inputs.push({ entry, input });
}

const factsParsed = launchFactsSchema.safeParse(readJson<unknown>("launch-facts.json"));
if (!factsParsed.success) {
  for (const [field, message] of Object.entries(articleFieldErrors(factsParsed.error))) {
    problems.push(`launch-facts.json: ${field}: ${message}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`[launch-content] ${problem}`);
  console.error(`[launch-content] ${problems.length} problem(s). Nothing was written.`);
  process.exit(1);
}

const counts = inputs.reduce<Record<string, number>>((acc, { input }) => {
  acc[input.type] = (acc[input.type] ?? 0) + 1;
  return acc;
}, {});
console.log(`[launch-content] valid: ${inputs.length} articles (${JSON.stringify(counts)}) + launch facts.`);
if (DRY_RUN) {
  console.log("[launch-content] --dry-run: nothing written.");
  process.exit(0);
}

// ── 2. Write (DEV only) ────────────────────────────────────────────────────────────────────
const env = loadDevEnv({ requireSecret: true });
const admin = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fail(what: string, error: { message: string }): never {
  console.error(`[launch-content] ${what}: ${error.message}`);
  process.exit(1);
}

// author_id as the CMS would set it: the admin (single-owner site; oldest admin if several).
const author = await admin
  .from("profiles")
  .select("id")
  .eq("role", "admin")
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
if (author.error) fail("admin lookup failed", author.error);
const authorId = author.data?.id ?? null;
if (!authorId) console.warn("[launch-content] No admin profile found; author_id stays empty.");

type Row = { id: string; slug: string; title: string; status: string };
const results: { status: "created" | "updated" | "skipped"; input: ArticleInput; row: Row; note?: string }[] = [];

async function findExisting(type: ArticleInput["type"], column: "slug" | "title", value: string) {
  const found = await admin
    .from("articles")
    .select("id, slug, title, status")
    .eq("type", type)
    .eq(column, value)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) fail(`lookup ${type} by ${column} "${value}" failed`, found.error);
  return found.data;
}

for (const { input } of inputs) {
  // Same slug, or the same title if the owner renamed the slug in the CMS before publishing.
  const existing = {
    data:
      (await findExisting(input.type, "slug", input.slug)) ?? (await findExisting(input.type, "title", input.title)),
  };

  const fields = {
    title: input.title,
    summary: input.summary || null,
    body_md: input.body,
    tags: input.tags,
    spoiler_level: input.spoilerLevel,
    fact_status: input.type === "fact" && input.factStatus ? input.factStatus : null,
    sources: input.sources,
  };

  if (existing.data) {
    const row = existing.data;
    if (!UPDATE) {
      results.push({ status: "skipped", input, row, note: "already exists" });
      continue;
    }
    if (row.status !== "draft" && row.status !== "review") {
      results.push({ status: "skipped", input, row, note: `${row.status}, never touched` });
      continue;
    }
    const updated = await admin
      .from("articles")
      .update(fields)
      .eq("id", row.id)
      .select("id, slug, title, status")
      .single();
    if (updated.error) fail(`update ${input.type}/${input.slug} failed`, updated.error);
    results.push({ status: "updated", input, row: updated.data });
    continue;
  }

  const created = await admin
    .from("articles")
    .insert({
      ...fields,
      type: input.type,
      slug: input.slug,
      status: "draft",
      published_at: null,
      pipeline_ran_at: null,
      author_id: authorId,
    })
    .select("id, slug, title, status")
    .single();
  if (created.error) fail(`insert ${input.type}/${input.slug} failed`, created.error);
  results.push({ status: "created", input, row: created.data });
}

// Launch Hub facts: fill when empty; overwrite only with --update.
const stored = await admin.from("site_settings").select("value").eq("key", "launch_facts").maybeSingle();
if (stored.error) fail("launch_facts read failed", stored.error);
const current = parseStoredLaunchFacts(stored.data?.value);
let factsStatus: string;
if (hasLaunchFacts(current) && !UPDATE) {
  factsStatus = "skipped (already filled; use --update to overwrite)";
} else {
  const saved = await admin
    .from("site_settings")
    .upsert({ key: "launch_facts", value: factsParsed.data! }, { onConflict: "key" });
  if (saved.error) fail("launch_facts write failed", saved.error);
  factsStatus = hasLaunchFacts(current) ? "updated" : "created";
}

// ── 3. Report ──────────────────────────────────────────────────────────────────────────────
for (const { status, input, row, note } of results) {
  const flag = row.slug !== input.slug ? ` (stored slug: ${row.slug})` : "";
  console.log(
    `${status.padEnd(7)} ${input.type.padEnd(7)} ${row.status.padEnd(9)} ${ADMIN_BASE}/admin/articles/${row.id}  ${row.title}${flag}${note ? `  [${note}]` : ""}`,
  );
}
console.log(`${factsStatus.split(" ")[0].padEnd(7)} launch facts       ${ADMIN_BASE}/admin/launch  ${factsStatus}`);
const tally = results.reduce<Record<string, number>>((acc, { status }) => {
  acc[status] = (acc[status] ?? 0) + 1;
  return acc;
}, {});
console.log(`[launch-content] done on DEV: ${JSON.stringify(tally)}; launch facts ${factsStatus}.`);
console.log("[launch-content] Script writes skip cache tags (D-051): /launch shows new facts within ~5 minutes.");
