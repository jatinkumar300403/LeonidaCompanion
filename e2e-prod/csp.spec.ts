import { expect, test, type Page } from "@playwright/test";

/**
 * The strict CSP (SPEC §13, D-014, D-092) must not break the site: no violations while pages load,
 * while Turnstile mounts, or while a clip facade loads its official player.
 */
function collectViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    // Turnstile's own iframe runs under Cloudflare's CSP and logs its own (harmless) violations.
    const source = message.location().url;
    if (/^(blob:)?https:\/\/challenges\.cloudflare\.com\//.test(source)) return;
    const text = message.text();
    if (/Content Security Policy|Refused to (load|execute|frame|connect|apply)/i.test(text)) violations.push(text);
  });
  return violations;
}

for (const path of ["/", "/tips", "/forum", "/clips", "/privacy", "/offline"]) {
  test(`no CSP violations on ${path}`, async ({ page }) => {
    const violations = collectViolations(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(violations).toEqual([]);
  });
}

test("Turnstile loads under the CSP on the removal form", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, "No Turnstile site key in .env.local.");
  const violations = collectViolations(page);
  await page.goto("/dmca");
  await page.getByLabel("Your name").focus();
  // The widget draws its iframe inside a shadow root, so check that its API started instead.
  await page.waitForFunction(() => "turnstile" in window, undefined, { timeout: 20_000 });
  expect(violations).toEqual([]);
});

test("a clip facade loads its official player under the CSP", async ({ page }) => {
  const violations = collectViolations(page);
  await page.goto("/clips");
  const play = page.getByRole("button", { name: /^Play clip: / }).first();
  test.skip((await play.count()) === 0, "No approved clips on DEV to play.");
  await play.click();
  const load = page.getByRole("button", { name: /^Load .+ video$/ });
  if (await load.isVisible()) await load.click();
  await expect(page.locator("iframe").first()).toBeVisible();
  expect(violations).toEqual([]);
});
