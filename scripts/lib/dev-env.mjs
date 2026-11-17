/**
 * Shared DEV guard for scripts and database tests (D-040). Loads .env.local and refuses to
 * continue unless every Supabase setting points at the DEV project.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Reasons the current environment is not safe to touch; empty when it is DEV. */
export function devEnvProblems(env = process.env, { requireSecret = false } = {}) {
  const problems = [];
  const devRef = env.SUPABASE_PROJECT_REF_DEV?.trim() ?? "";
  const prodRef = env.SUPABASE_PROJECT_REF_PROD?.trim() ?? "";
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  if (!/^[a-z]{20}$/.test(devRef)) problems.push("SUPABASE_PROJECT_REF_DEV is missing or not a 20-letter project ref");
  if (prodRef && prodRef === devRef) problems.push("SUPABASE_PROJECT_REF_DEV equals SUPABASE_PROJECT_REF_PROD");
  if (url && devRef && url.replace(/\/+$/, "") !== `https://${devRef}.supabase.co`) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL is not the DEV project URL (https://<dev-ref>.supabase.co)");
  }
  if (requireSecret) {
    if (!url) problems.push("NEXT_PUBLIC_SUPABASE_URL is missing");
    if (!env.SUPABASE_SECRET_KEY?.trim()) problems.push("SUPABASE_SECRET_KEY is missing");
  }

  const linkedFile = join(repoRoot, "supabase", ".temp", "project-ref");
  if (devRef && existsSync(linkedFile)) {
    const linked = readFileSync(linkedFile, "utf8").trim();
    if (linked && linked !== devRef)
      problems.push("supabase/.temp/project-ref is not the DEV project (run pnpm db:link)");
  }
  return problems;
}

/** Loads .env.local (without overriding the shell) and exits when it isn't DEV. */
export function loadDevEnv(options) {
  const envFile = join(repoRoot, ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const problems = devEnvProblems(process.env, options);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[dev-guard] ${problem}. Refusing.`);
    process.exit(1);
  }
  return process.env;
}
