import { describe, expect, it } from "vitest";
import { parseHostList, parsePublicEnv } from "./public";

describe("parseHostList", () => {
  it("defaults to localhost", () => {
    expect(parseHostList(undefined)).toEqual(["localhost"]);
    expect(parseHostList("")).toEqual(["localhost"]);
  });

  it("trims, lowercases, drops ports and duplicates", () => {
    expect(parseHostList(" localhost, Example.com:443 ,www.example.com,example.com,")).toEqual([
      "localhost",
      "example.com",
      "www.example.com",
    ]);
  });
});

describe("parsePublicEnv", () => {
  it("applies defaults for a blank environment", () => {
    expect(parsePublicEnv({})).toEqual({
      siteName: undefined,
      siteUrl: "http://localhost:3000",
      siteHosts: ["localhost"],
      showImpressum: false,
      supabaseConfigured: false,
      supabaseUrl: undefined,
      supabasePublishableKey: undefined,
      turnstileSiteKey: undefined,
      sentryDsn: undefined,
      contactEmail: undefined,
    });
  });

  it("reads the public contact address (Phase 9)", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_CONTACT_EMAIL: " hello@example.com " }).contactEmail).toBe("hello@example.com");
  });

  it("strips a trailing slash from the site URL and reads flags", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SITE_URL: "https://example.com/",
      NEXT_PUBLIC_SHOW_IMPRESSUM: "TRUE",
      NEXT_PUBLIC_SITE_NAME: " Atlas ",
    });
    expect(env.siteUrl).toBe("https://example.com");
    expect(env.showImpressum).toBe(true);
    expect(env.siteName).toBe("Atlas");
  });

  it("needs both Supabase values before calling it configured", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }).supabaseConfigured).toBe(false);
    expect(
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" })
        .supabaseConfigured,
    ).toBe(true);
  });
});
