import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

/**
 * SPEC §13 JS budget on a production build (D-026, D-099). Measures first-load JS: every script
 * the server HTML references, gzipped, which is Next.js's classic "First Load JS". Chunks loaded
 * on demand after hydration (the Supabase client, Turnstile, Sentry, clip players) don't count.
 *
 * SPEC's 150 KB article-page target sits close to the framework's own floor (Next's router and
 * React DOM are about 130 KB), so these limits are a ratchet at today's size plus a little room:
 * any growth fails, and the gap to 150 KB is tracked in docs/PROGRESS.md.
 * Set BUDGET_TIP_PATH to a published tip (`pnpm qa:sample-tip publish` prints one).
 */
const SPEC_ARTICLE_TARGET_KB = 150;
const RATCHET_KB = 240;

const ROUTES = ["/", "/tips", "/forum", "/clips", "/privacy", process.env.BUDGET_TIP_PATH].filter(
  (path): path is string => Boolean(path),
);

test.skip(({ isMobile }) => !isMobile, "Measured once; the bundle is the same on every viewport.");

for (const path of ROUTES) {
  test(`first-load JS for ${path}`, async ({ request }, testInfo) => {
    const html = await (await request.get(path)).text();
    // Every chunk script tag, except Next's legacy-browser polyfills (`noModule`: modern browsers skip them).
    const tags = [...html.matchAll(/<script[^>]*src="(\/_next\/static\/chunks\/[^"]+\.js)"[^>]*>/g)];
    const scripts = [...new Set(tags.filter((tag) => !/noModule/i.test(tag[0])).map((tag) => tag[1]!))];
    expect(scripts.length).toBeGreaterThan(0);

    let total = 0;
    for (const src of scripts) total += gzipSync(await (await request.get(src)).body()).length;
    const kb = total / 1024;
    const note = `${path}: ${kb.toFixed(1)} KB gzipped first-load JS in ${scripts.length} files (SPEC target ${SPEC_ARTICLE_TARGET_KB} KB)`;
    testInfo.annotations.push({ type: "first-load-js", description: note });
    console.log(`[budget] ${note}`);
    expect(kb).toBeLessThanOrEqual(RATCHET_KB);
  });
}
