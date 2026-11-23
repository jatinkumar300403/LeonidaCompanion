import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
let blocked = false;
vi.mock("@vercel/analytics", () => ({
  track: (...args: unknown[]) => {
    if (blocked) throw new Error("blocked by an extension");
    track(...args);
  },
}));

const { ANALYTICS_EVENTS, isAnalyticsEvent, sanitizeEventProps, trackEvent } = await import("./events");

describe("analytics events (SPEC §13)", () => {
  beforeEach(() => {
    track.mockReset();
    blocked = false;
  });

  it("lists exactly the SPEC §13 custom events", () => {
    expect([...ANALYTICS_EVENTS].sort()).toEqual(
      [
        "article_helpful",
        "ask_feedback",
        "ask_submitted",
        "clip_played",
        "newsletter_signup",
        "post_created",
        "pwa_installed",
        "thread_created",
      ].sort(),
    );
    expect(isAnalyticsEvent("clip_played")).toBe(true);
    expect(isAnalyticsEvent("page_view")).toBe(false);
  });

  it("keeps props small and primitive", () => {
    expect(sanitizeEventProps(undefined)).toBeUndefined();
    expect(sanitizeEventProps({ a: undefined })).toBeUndefined();
    expect(sanitizeEventProps({ platform: "youtube", helpful: true, n: 3, gone: null })).toEqual({
      platform: "youtube",
      helpful: true,
      n: 3,
      gone: null,
    });
    expect(sanitizeEventProps({ long: "x".repeat(200) })?.long).toHaveLength(60);
    expect(sanitizeEventProps({ bad: Number.NaN })).toBeUndefined();
    const many = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(sanitizeEventProps(many) ?? {})).toHaveLength(6);
  });

  it("sends through Vercel Analytics and never throws", () => {
    trackEvent("clip_played", { platform: "twitch" });
    expect(track).toHaveBeenCalledWith("clip_played", { platform: "twitch" });

    blocked = true;
    expect(() => trackEvent("pwa_installed")).not.toThrow();
  });
});
