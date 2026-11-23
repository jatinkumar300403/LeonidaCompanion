import { describe, expect, it } from "vitest";
import { classifyRequest, isArticlePath, isPrivatePath, type RequestFacts } from "./cache-rules";
import { installBannerMode, isIosSafari, readNumber, type InstallBannerInput } from "./install";

function facts(path: string, overrides: Partial<RequestFacts> = {}): RequestFacts {
  return {
    url: new URL(path, "https://example.com"),
    sameOrigin: true,
    method: "GET",
    destination: "document",
    isRsc: false,
    ...overrides,
  };
}

describe("service-worker caching rules (SPEC §13)", () => {
  it("caches hashed assets and icons first", () => {
    expect(classifyRequest(facts("/_next/static/chunks/app.js", { destination: "script" }))).toBe("static");
    expect(classifyRequest(facts("/_next/static/media/font.woff2", { destination: "font" }))).toBe("static");
    expect(classifyRequest(facts("/icons/icon-192.png", { destination: "image" }))).toBe("static");
    expect(classifyRequest(facts("/favicon.ico", { destination: "image" }))).toBe("static");
  });

  it("revalidates optimised images in the background", () => {
    expect(classifyRequest(facts("/_next/image?url=x&w=640&q=75", { destination: "image" }))).toBe("image");
  });

  it("keeps guides readable offline (stale-while-revalidate)", () => {
    for (const path of ["/tips/lose-wanted-level", "/features/heists", "/facts/map-size", "/launch", "/online/x"]) {
      expect(classifyRequest(facts(path)), path).toBe("article");
    }
    expect(isArticlePath("/tips")).toBe(false);
    expect(isArticlePath("/tips/a/b")).toBe(false);
  });

  it("uses network-first for other public pages", () => {
    for (const path of ["/", "/tips", "/forum", "/forum/t/1/x", "/clips/3", "/privacy"]) {
      expect(classifyRequest(facts(path)), path).toBe("page");
    }
  });

  it("never caches private, account, admin or form pages", () => {
    for (const path of [
      "/admin",
      "/admin/moderation",
      "/settings",
      "/onboarding",
      "/sign-in",
      "/auth/callback",
      "/forum/new",
      "/clips/submit",
      "/u/someone",
      "/newsletter/confirm",
      "/search",
    ]) {
      expect(classifyRequest(facts(path)), path).toBe("private");
    }
    expect(isPrivatePath("/administrator")).toBe(false);
    expect(isPrivatePath("/settings-help")).toBe(false);
  });

  it("leaves APIs, RSC payloads, POSTs, files and other origins alone", () => {
    expect(classifyRequest(facts("/api/og?title=x", { destination: "image" }))).toBe("none");
    expect(classifyRequest(facts("/tips/x", { destination: "", isRsc: true }))).toBe("none");
    expect(classifyRequest(facts("/tips/x", { method: "POST" }))).toBe("none");
    expect(classifyRequest(facts("/rss.xml", { destination: "" }))).toBe("none");
    expect(classifyRequest(facts("/tips/x", { sameOrigin: false }))).toBe("none");
  });

  it("treats CACHE_URLS fetches of page paths like navigations", () => {
    expect(classifyRequest(facts("/tips/x", { destination: "" }))).toBe("article");
    expect(classifyRequest(facts("/forum", { destination: "" }))).toBe("page");
  });
});

describe("install banner (SPEC §13: after the 2nd visit)", () => {
  const base: InstallBannerInput = {
    visits: 2,
    dismissedAt: null,
    now: Date.parse("2026-11-23T12:00:00Z"),
    standalone: false,
    canPrompt: true,
    iosSafari: false,
    installed: false,
  };

  it("waits for the second visit", () => {
    expect(installBannerMode({ ...base, visits: 1 })).toBe("hidden");
    expect(installBannerMode(base)).toBe("prompt");
    expect(installBannerMode({ ...base, visits: 9 })).toBe("prompt");
  });

  it("stays away when installed, running standalone or not installable", () => {
    expect(installBannerMode({ ...base, standalone: true })).toBe("hidden");
    expect(installBannerMode({ ...base, installed: true })).toBe("hidden");
    expect(installBannerMode({ ...base, canPrompt: false })).toBe("hidden");
  });

  it("shows the Share hint on iOS Safari", () => {
    expect(installBannerMode({ ...base, canPrompt: false, iosSafari: true })).toBe("ios");
  });

  it("snoozes for 30 days after Not now", () => {
    const day = 86_400_000;
    expect(installBannerMode({ ...base, dismissedAt: base.now - 29 * day })).toBe("hidden");
    expect(installBannerMode({ ...base, dismissedAt: base.now - 31 * day })).toBe("prompt");
  });

  it("reads stored numbers defensively", () => {
    expect(readNumber("3")).toBe(3);
    expect(readNumber(null)).toBeNull();
    expect(readNumber("abc")).toBeNull();
    expect(readNumber("-1")).toBeNull();
  });

  it("recognises iOS Safari only", () => {
    const safari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    const chromeIos =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1";
    const ipadDesktop =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    const android =
      "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36";
    expect(isIosSafari(safari)).toBe(true);
    expect(isIosSafari(chromeIos)).toBe(false);
    expect(isIosSafari(ipadDesktop, 5)).toBe(true);
    expect(isIosSafari(ipadDesktop, 0)).toBe(false);
    expect(isIosSafari(android)).toBe(false);
  });
});
