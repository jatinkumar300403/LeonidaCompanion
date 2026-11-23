import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 9: SEO files, the manifest, security headers, the offline page, the legal pages and the
 * install banner (SPEC §13, §14). No sign-ins, so these never use DEV's verify budget (D-089).
 * The service worker itself only runs in production builds; e2e-prod/pwa.spec.ts covers it.
 */

test.describe("SEO and PWA files", () => {
  test.skip(({ isMobile }) => isMobile, "Same responses on every viewport; checked once on desktop.");

  test("robots.txt keeps private areas out and points at the sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("User-Agent: *");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /settings");
    expect(robots).toContain("Allow: /api/og");
    expect(robots).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
  });

  test("the sitemap index lists every section, and each section is valid", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");
    const index = await response.text();
    expect(index).toContain("<sitemapindex");
    for (const section of ["pages", "tips", "features", "facts", "forum", "clips"]) {
      expect(index).toContain(`/sitemaps/${section}.xml</loc>`);
      const part = await request.get(`/sitemaps/${section}.xml`);
      expect(part.status(), section).toBe(200);
      expect(await part.text(), section).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    }
    const pages = await (await request.get("/sitemaps/pages.xml")).text();
    for (const path of ["/privacy</loc>", "/terms</loc>", "/dmca</loc>", "/forum</loc>"]) expect(pages).toContain(path);
    expect(pages).not.toContain("/search");
    expect(pages).not.toContain("/admin");
    expect((await request.get("/sitemaps/admin.xml")).status()).toBe(404);
  });

  test("rss.xml is an RSS 2.0 feed", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/rss+xml");
    const feed = await response.text();
    expect(feed).toContain('<rss version="2.0"');
    expect(feed).toContain('rel="self"');
  });

  test("the manifest names the app and its icons exist", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.theme_color).toBe("#ff3d8b");
    const purposes = manifest.icons.map((icon: { sizes: string; purpose: string }) => `${icon.sizes} ${icon.purpose}`);
    expect(purposes).toEqual(
      expect.arrayContaining(["192x192 any", "512x512 any", "192x192 maskable", "512x512 maskable"]),
    );
    for (const icon of manifest.icons as { src: string; type: string }[]) {
      const file = await request.get(icon.src);
      expect(file.status(), icon.src).toBe(200);
      expect(file.headers()["content-type"], icon.src).toContain(icon.type);
    }
  });

  test("OG images render", async ({ request }) => {
    const response = await request.get("/api/og?title=How%20to%20lose%20a%20wanted%20level&section=Tips");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });

  test("pages send the security headers and CSP", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("frame-src 'self' https://clips.twitch.tv");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  test("the home page links the RSS feed and has an OG image", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
      "href",
      /\/rss\.xml$/,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/api\/og/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  });
});

test("the offline page explains what's saved and stays out of search", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You're offline");
  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved on this device" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test.describe("legal pages (SPEC §14)", () => {
  for (const [path, title] of [
    ["/disclaimer", "Disclaimer"],
    ["/privacy", "Privacy"],
    ["/terms", "Terms of use"],
    ["/credits", "Credits"],
    ["/community-guidelines", "Community guidelines"],
    ["/dmca", "Content removal"],
  ] as const) {
    test(`${path} is a dated draft`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      const status = page.getByTestId("legal-status");
      await expect(status).toContainText("Draft");
      await expect(status).toContainText(/Last updated \d{1,2} \w+ 2026/);
    });
  }

  test("the disclaimer quotes the footer disclaimer and the pages link each other", async ({ page }) => {
    await page.goto("/disclaimer");
    const main = page.getByRole("main");
    await expect(main.getByText("Unofficial fan site. Not affiliated with, endorsed or sponsored by")).toBeVisible();
    await expect(main.getByRole("link", { name: "Community guidelines" })).toHaveAttribute(
      "href",
      "/community-guidelines",
    );
    await expect(main.getByRole("link", { name: "Credits" }).first()).toHaveAttribute("href", "/credits");
  });

  test("contact points to the removal form and Report", async ({ page }) => {
    await page.goto("/contact");
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "content removal form" })).toHaveAttribute("href", "/dmca");
    await expect(main.getByText("Report", { exact: true })).toBeVisible();
  });
});

/** A stand-in for Chrome's install event: `prompt()` resolves and the user makes `outcome`. */
async function offerInstall(page: Page, outcome: "accepted" | "dismissed") {
  await page.evaluate((choice) => {
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome: choice });
    window.dispatchEvent(event);
  }, outcome);
}

test.describe("install banner (SPEC §13: after the 2nd visit)", () => {
  test("stays hidden on the first visit", async ({ page }) => {
    await page.goto("/tips");
    await offerInstall(page, "dismissed");
    await page.waitForTimeout(300);
    await expect(page.getByTestId("install-banner")).toHaveCount(0);
  });

  test("appears from the second visit, and Not now snoozes it", async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem("la_visit_counted")) window.localStorage.setItem("la_visits", "1");
    });
    await page.goto("/tips");
    await offerInstall(page, "dismissed");
    const banner = page.getByTestId("install-banner");
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("heading")).toContainText("Install");
    await banner.getByRole("button", { name: "Not now" }).click();
    await expect(banner).toHaveCount(0);

    await page.reload();
    await offerInstall(page, "dismissed");
    await page.waitForTimeout(300);
    await expect(page.getByTestId("install-banner")).toHaveCount(0);
  });

  test("Install opens the browser prompt and the banner leaves once installed", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("la_visits", "5"));
    await page.goto("/");
    await offerInstall(page, "accepted");
    const banner = page.getByTestId("install-banner");
    await banner.getByRole("button", { name: "Install", exact: true }).click();
    await expect(banner).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await offerInstall(page, "accepted");
    await page.waitForTimeout(300);
    await expect(page.getByTestId("install-banner")).toHaveCount(0);
  });
});
