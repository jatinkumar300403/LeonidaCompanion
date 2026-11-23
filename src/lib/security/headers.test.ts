import { describe, expect, it } from "vitest";
import { EMBED_FRAME_HOSTS } from "@/config/clips";
import { buildCsp, buildCspDirectives, PERMISSIONS_POLICY, securityHeaders, thumbnailSources } from "./headers";

const SUPABASE = "https://abcd.supabase.co";
const DSN = "https://key@o123.ingest.us.sentry.io/456";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split("; ").map((part) => {
      const [name, ...sources] = part.split(" ");
      return [name!, sources];
    }),
  );
}

describe("Content-Security-Policy (SPEC §13, D-014)", () => {
  const prod = directives(buildCsp({ dev: false, supabaseUrl: SUPABASE, sentryDsn: DSN }));

  it("keeps the strict directives", () => {
    expect(prod.get("default-src")).toEqual(["'self'"]);
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("base-uri")).toEqual(["'self'"]);
    expect(prod.get("form-action")).toEqual(["'self'"]);
    expect(prod.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("allows only the official players and Turnstile in frames", () => {
    expect(prod.get("frame-src")).toEqual(["'self'", ...EMBED_FRAME_HOSTS]);
  });

  it("lets Turnstile and TikTok's embed.js run, without eval in production", () => {
    const scripts = prod.get("script-src")!;
    expect(scripts).toContain("https://challenges.cloudflare.com");
    expect(scripts).toContain("https://www.tiktok.com");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(directives(buildCsp({ dev: true })).get("script-src")).toContain("'unsafe-eval'");
  });

  it("allows Supabase storage images, platform thumbnails and API calls", () => {
    expect(prod.get("img-src")).toEqual(expect.arrayContaining(["'self'", SUPABASE, "https://i.ytimg.com"]));
    expect(prod.get("img-src")).toContain("https://*.tiktokcdn.com");
    expect(prod.get("connect-src")).toEqual(
      expect.arrayContaining([SUPABASE, "wss://abcd.supabase.co", "https://challenges.cloudflare.com"]),
    );
  });

  it("adds Sentry's ingest origin only when a DSN is set", () => {
    expect(prod.get("connect-src")).toContain("https://o123.ingest.us.sentry.io");
    const noDsn = directives(buildCsp({ dev: false, supabaseUrl: SUPABASE }));
    expect(noDsn.get("connect-src")!.some((source) => source.includes("sentry"))).toBe(false);
  });

  it("ignores malformed URLs instead of emitting junk sources", () => {
    const csp = buildCsp({ dev: false, supabaseUrl: "not a url", sentryDsn: "javascript:alert(1)" });
    expect(csp).not.toContain("not a url");
    expect(csp).not.toContain("javascript:");
  });

  it("allows the service worker and manifest from our own origin", () => {
    expect(prod.get("worker-src")).toEqual(["'self'", "blob:"]);
    expect(prod.get("manifest-src")).toEqual(["'self'"]);
  });

  it("never repeats a directive", () => {
    const names = buildCsp({ dev: false, supabaseUrl: SUPABASE })
      .split("; ")
      .map((part) => part.split(" ")[0]);
    expect(new Set(names).size).toBe(names.length);
    expect(Object.keys(buildCspDirectives({ dev: false })).length).toBe(names.length);
  });

  it("converts next/image wildcards into CSP wildcards", () => {
    expect(thumbnailSources()).toContain("https://*.tiktokcdn-us.com");
    expect(thumbnailSources().every((source) => !source.includes("**"))).toBe(true);
  });
});

describe("security headers (SPEC §13)", () => {
  const headers = new Map(securityHeaders({ dev: false }).map(({ key, value }) => [key, value]));

  it("sends HSTS, referrer, permissions, nosniff and frame headers", () => {
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toBe(PERMISSIONS_POLICY);
  });

  it("keeps fullscreen and autoplay available for the clip players", () => {
    expect(PERMISSIONS_POLICY).toContain("camera=()");
    expect(PERMISSIONS_POLICY).not.toMatch(/fullscreen|autoplay|encrypted-media/);
  });
});
