import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Deletes the e2e test users and their data from DEV (scripts/cleanup-test-data.mjs). */
export default function globalTeardown() {
  if (!existsSync(join(process.cwd(), ".env.local"))) return;
  const result = spawnSync(process.execPath, ["scripts/cleanup-test-data.mjs"], { stdio: "inherit" });
  if (result.status !== 0) console.warn("[e2e] test-data cleanup failed; run `pnpm test:cleanup`.");
}
