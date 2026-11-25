import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { ROBOTS_ALLOW, ROBOTS_DISALLOW } from "./robots";

/**
 * SPEC §13 metadata audit (Phase 9): every route has metadata, and the private or thin routes are
 * noindex. Reads the route files themselves, so a new page can't skip it.
 */
const APP = join(process.cwd(), "src", "app");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return name === "page.tsx" ? [path] : [];
  });
}

/** "src/app/(site)/forum/new/page.tsx" → "/forum/new" */
function routeOf(file: string): string {
  const segments = relative(APP, file)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !segment.startsWith("("));
  return `/${segments.join("/")}`;
}

const ALL = pages(APP).map((file) => ({ file, route: routeOf(file), source: readFileSync(file, "utf8") }));

/** SPEC §13: search, settings, admin, forum/new, plus the other private, form and fallback pages. */
const MUST_BE_NOINDEX = [
  "/search",
  "/settings",
  "/forum/new",
  "/clips/submit",
  "/sign-in",
  "/onboarding",
  "/offline",
  "/newsletter/confirm",
];

describe("route metadata audit (SPEC §13)", () => {
  it("finds the app's pages", () => {
    expect(ALL.length).toBeGreaterThan(30);
    expect(ALL.map((page) => page.route)).toContain("/tips/[slug]");
  });

  it.each(ALL.map((page) => [page.route, page] as const))("%s exports metadata", (_route, page) => {
    expect(page.source).toMatch(/export (async )?function generateMetadata|export const metadata\b/);
  });

  it.each(MUST_BE_NOINDEX)("%s is noindex", (route) => {
    const page = ALL.find((entry) => entry.route === route);
    expect(page, route).toBeDefined();
    expect(page!.source).toMatch(/noindex: true/);
  });

  it("keeps every admin page out of search through the admin layout", () => {
    const layout = readFileSync(join(APP, "admin", "layout.tsx"), "utf8");
    expect(layout).toMatch(/robots: \{ index: false, follow: false \}/);
  });

  it("builds titles and canonicals through buildMetadata on public pages", () => {
    const publicPages = ALL.filter((page) => !page.route.startsWith("/admin"));
    for (const page of publicPages) {
      expect(page.source, page.route).toMatch(/buildMetadata|articleMetadata|indexMetadata/);
    }
  });

  it("robots.txt blocks the same private areas", () => {
    for (const path of ["/admin", "/settings", "/search", "/forum/new", "/onboarding"]) {
      expect(ROBOTS_DISALLOW.some((rule) => path.startsWith(rule.replace(/\/$/, "")))).toBe(true);
    }
    expect(ROBOTS_DISALLOW).not.toContain("/api/og");
  });

  it("robots.txt lets crawlers read link previews and the IndexNow key under /api/ (D-113)", () => {
    expect(ROBOTS_ALLOW).toEqual(expect.arrayContaining(["/", "/api/og", "/api/indexnow"]));
    for (const rule of ROBOTS_ALLOW) expect(ROBOTS_DISALLOW).not.toContain(rule);
  });
});
