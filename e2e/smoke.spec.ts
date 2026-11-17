import { expect, test } from "@playwright/test";
import { bottomTabs, footerNav, mainNav, moreNav } from "../src/config/nav";
import { siteConfig } from "../src/config/site";

/** Phase 1 smoke tests: the shell, navigation, theme and spoilers on mobile and desktop. */

test("home renders the hero, the footer disclaimer and structured data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your unofficial guide to GTA VI");
  await expect(page.getByTestId("site-disclaimer")).toHaveText(siteConfig.disclaimer);
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(jsonLd ?? "{}")["@type"]).toBe("WebSite");
});

test("every header, tab bar, More and footer link resolves", async ({ request, isMobile }) => {
  test.skip(isMobile, "Same links on every viewport; checked once on desktop.");
  test.setTimeout(180_000);
  const hrefs = new Set<string>([
    ...[...mainNav, ...bottomTabs, ...moreNav].map((item) => item.href),
    ...footerNav.flatMap((group) => group.links.map((link) => link.href)),
    "/search",
    "/sign-in",
  ]);
  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test("unknown pages get the 404 page inside the site shell", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't on the map");
  await expect(page.getByTestId("site-disclaimer")).toBeVisible();
});

test("the skip link jumps to the main content", async ({ page }) => {
  await page.goto("/tips");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("the theme follows the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\blight\b/);

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

test("spoilers stay hidden until revealed by keyboard", async ({ page }) => {
  await page.goto("/admin/ui");
  const states = page.locator('section[aria-labelledby="states"]');

  const inline = states.getByRole("button", { name: "Spoiler, hidden. Activate to reveal." });
  await inline.focus();
  await page.keyboard.press("Enter");
  await expect(states.getByText("a sample inline spoiler")).toBeVisible();
  await expect(inline).toHaveCount(0);

  const block = states
    .locator("[data-spoiler-state]")
    .filter({ has: page.getByRole("button", { name: "Show spoiler" }) });
  await expect(block).toHaveAttribute("data-spoiler-state", "hidden");
  await block.getByRole("button", { name: "Show spoiler" }).focus();
  await page.keyboard.press("Enter");
  await expect(states.locator('[data-spoiler-state="revealed"]')).toHaveCount(2);
});

test("mobile: bottom tab bar and the More sheet", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile layout only.");
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "Primary" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");

  await tabs.getByRole("button", { name: "More" }).click();
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
  await sheet.getByRole("link", { name: /Launch Hub/ }).click();
  await expect(page).toHaveURL(/\/launch$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("GTA 6 Launch Hub");
});

test("desktop: header nav marks the current section", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop layout only.");
  await page.goto("/tips");
  const header = page.getByRole("navigation", { name: "Main" });
  await expect(header.getByRole("link", { name: "Tips" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
});
