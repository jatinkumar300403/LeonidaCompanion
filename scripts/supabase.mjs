#!/usr/bin/env node
/**
 * DEV-only wrapper around the Supabase CLI (D-008, D-040).
 *
 * - Loads .env.local, so SUPABASE_ACCESS_TOKEN reaches the CLI (it mints a temporary login role,
 *   so no database password is needed when the token has database write access).
 * - Refuses to run unless SUPABASE_PROJECT_REF_DEV is set, differs from SUPABASE_PROJECT_REF_PROD,
 *   matches NEXT_PUBLIC_SUPABASE_URL and matches supabase/.temp/project-ref when linked.
 * - Replaces the token `@dev` in the arguments with the DEV ref, so commands target DEV explicitly
 *   (`--remote=@dev`), never whatever happens to be linked.
 * - `--out <file>` writes the CLI's stdout to a file (used by `pnpm db:types`).
 *
 * Usage: node scripts/supabase.mjs <cli args…> [--out file]
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { loadDevEnv, repoRoot } from "./lib/dev-env.mjs";

const env = loadDevEnv();
const devRef = env.SUPABASE_PROJECT_REF_DEV.trim();
const prodRef = env.SUPABASE_PROJECT_REF_PROD?.trim() ?? "";

if (!env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.error("[supabase] SUPABASE_ACCESS_TOKEN is missing (.env.local).");
  process.exit(1);
}

let outFile;
const args = [];
const raw = process.argv.slice(2);
for (let i = 0; i < raw.length; i++) {
  if (raw[i] === "--out") {
    outFile = raw[++i];
    continue;
  }
  args.push(raw[i].replaceAll("@dev", devRef));
}
if (prodRef && args.some((arg) => arg.includes(prodRef))) {
  console.error("[supabase] The PROD ref appeared in the arguments. Refusing.");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("supabase/package.json")), "dist", "supabase.js");

const result = spawnSync(process.execPath, [cli, ...args], {
  cwd: repoRoot,
  env,
  stdio: outFile ? ["inherit", "pipe", "inherit"] : "inherit",
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});

if (result.error) {
  console.error(`[supabase] ${result.error.message}`);
  process.exit(1);
}
if (outFile && result.status === 0) {
  writeFileSync(join(repoRoot, outFile), result.stdout.replace(/\r\n/g, "\n"));
  console.error(`[supabase] wrote ${outFile}`);
}
process.exit(result.status ?? 1);
