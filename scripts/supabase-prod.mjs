#!/usr/bin/env node
/**
 * The one sanctioned PROD database command (Phase 11, D-112). Pushes supabase/migrations and
 * supabase/seed.sql to the PROD project, then stores SEED_ADMIN_EMAIL as the seed admin (D-041).
 * No sample content: `pnpm seed:dev` is never run against PROD.
 *
 * - Needs SUPABASE_PROJECT_REF_PROD in .env.local and CONFIRM_PROD=<that ref> in the shell.
 * - Targets PROD with `--remote=<ref>`, so the CLI link (DEV) is never changed. It checks the
 *   link before and after.
 * - Extra arguments go to `supabase db push`, e.g. `pnpm db:push:prod --dry-run`.
 *
 * PowerShell: $env:CONFIRM_PROD="<prod-ref>"; pnpm db:push:prod --dry-run
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { prodGuardProblems, seedAdminSql } from "./lib/prod-env.mjs";
import { repoRoot } from "./lib/dev-env.mjs";

const envFile = join(repoRoot, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = process.env;

const linkedFile = join(repoRoot, "supabase", ".temp", "project-ref");
const linkedRef = () => (existsSync(linkedFile) ? readFileSync(linkedFile, "utf8").trim() : null);

const problems = prodGuardProblems(env, linkedRef());
if (problems.length > 0) {
  for (const problem of problems) console.error(`[prod] ${problem}. Refusing.`);
  process.exit(1);
}

const prodRef = env.SUPABASE_PROJECT_REF_PROD.trim();
const devRef = env.SUPABASE_PROJECT_REF_DEV.trim();
const extra = process.argv.slice(2);
const dryRun = extra.includes("--dry-run");

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("supabase/package.json")), "dist", "supabase.js");

console.log(`[prod] Pushing migrations + seed to PROD (${prodRef})${dryRun ? " — dry run" : ""}.`);
const push = spawnSync(
  process.execPath,
  [cli, "db", "push", `--remote=${prodRef}`, "--include-seed", "--yes", ...extra],
  {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  },
);
if (push.error || push.status !== 0) {
  console.error(`[prod] supabase db push failed${push.error ? `: ${push.error.message}` : ""}.`);
  process.exit(1);
}

if (!dryRun) {
  const email = env.SEED_ADMIN_EMAIL?.trim();
  if (!email || email === "you@example.com") {
    console.log("[prod] SEED_ADMIN_EMAIL is not set; skipping the seed admin.");
  } else {
    const response = await fetch(`https://api.supabase.com/v1/projects/${prodRef}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: seedAdminSql(email) }),
    });
    if (!response.ok) {
      console.error(`[prod] seed admin failed: HTTP ${response.status}.`);
      process.exit(1);
    }
    const rows = await response.json();
    console.log(
      rows?.[0]?.promoted
        ? "[prod] SEED_ADMIN_EMAIL is an admin on PROD."
        : "[prod] Seed admin saved. That account becomes admin on PROD when it finishes onboarding.",
    );
  }
}

const after = linkedRef();
if (after && after !== devRef) {
  console.error("[prod] The CLI link is no longer DEV. Run pnpm db:link now.");
  process.exit(1);
}
console.log(`[prod] Done. The CLI is still linked to DEV (${after ? "checked" : "not linked"}).`);
