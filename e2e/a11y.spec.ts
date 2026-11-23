import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Phase 9 accessibility gate (SPEC §15: axe scan with 0 serious issues; WCAG 2.2 AA). Every
 * public page a visitor can reach without signing in, on the phone and desktop viewports, in the
 * default (dark) and light themes. Next's dev overlay isn't part of the site, so it's excluded.
 */
const ROUTES = [
  "/",
  "/tips",
  "/features",
  "/facts",
  "/launch",
  "/online",
  "/forum",
  "/clips",
  "/ask",
  "/search",
  "/sign-in",
  "/disclaimer",
  "/privacy",
  "/terms",
  "/community-guidelines",
  "/dmca",
  "/credits",
  "/contact",
  "/offline",
  "/this-page-does-not-exist",
];

test.describe.configure({ mode: "parallel" });

for (const route of ROUTES) {
  for (const scheme of ["dark", "light"] as const) {
    test(`axe: ${route} (${scheme}) has no serious or critical issues`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(route);
      await page.waitForLoadState("load");
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${scheme}\\b`));

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .exclude("nextjs-portal")
        .analyze();
      const blocking = results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
        }));
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}
