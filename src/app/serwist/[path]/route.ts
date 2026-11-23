import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";
import { OFFLINE_PATH } from "@/lib/pwa/cache-rules";

/**
 * Serves the service worker at /serwist/sw.js (SPEC §13, D-009, D-095), built from src/app/sw.ts
 * at build time. The offline page is precached with the commit as its revision, so each deploy
 * refreshes it.
 */
function revision(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel;
  const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  return git.status === 0 && git.stdout.trim() ? git.stdout.trim() : randomUUID();
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  additionalPrecacheEntries: [{ url: OFFLINE_PATH, revision: revision() }],
  // Precache only what every page needs to look right offline: the CSS, the preloaded Latin font
  // files (`*.p.*.woff2`; other subsets load on demand) and the icons. That's about 200 KB instead
  // of every JS chunk (2.6 MB, admin included); JS is cached as pages are visited.
  globPatterns: [".next/static/**/*.css", ".next/static/media/*.p.*.woff2", "public/icons/*.png"],
  useNativeEsbuild: true,
});
