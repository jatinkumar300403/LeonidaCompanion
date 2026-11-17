import { describe, expect, it } from "vitest";
import { articleFieldErrors, articleInputSchema, isOwnCoverUrl, publishProblems, quickTipSchema } from "./article";
import { EMPTY_LAUNCH_FACTS, hasLaunchFacts, launchFactsSchema, parseStoredLaunchFacts } from "./launch-facts";

const base = { type: "tip", title: "A title", summary: "Summary", body: "Body text." } as const;

describe("quickTipSchema", () => {
  it("accepts a phone-sized tip and fills defaults", () => {
    const tip = quickTipSchema.parse({ title: "Save often", body: "Save before every mission. It costs nothing." });
    expect(tip).toMatchObject({ sourceUrl: "", tags: [], spoilerLevel: "none" });
  });

  it("enforces the length limits and URL format", () => {
    expect(quickTipSchema.safeParse({ title: "Hi", body: "Too short title." }).success).toBe(false);
    expect(quickTipSchema.safeParse({ title: "Valid title", body: "x".repeat(701) }).success).toBe(false);
    expect(
      quickTipSchema.safeParse({ title: "Valid title", body: "Long enough body text.", sourceUrl: "nope" }).success,
    ).toBe(false);
    expect(
      quickTipSchema.safeParse({ title: "Valid title", body: "Long enough body text.", tags: ["not-a-tag"] }).success,
    ).toBe(false);
  });

  it("de-duplicates tags and caps them", () => {
    const tip = quickTipSchema.parse({
      title: "Valid title",
      body: "Long enough body text.",
      tags: ["money", "money"],
    });
    expect(tip.tags).toEqual(["money"]);
    const tooMany = ["money", "combat", "driving", "stealth", "missions", "heists", "map"];
    expect(quickTipSchema.safeParse({ title: "Valid title", body: "Long enough body.", tags: tooMany }).success).toBe(
      false,
    );
  });
});

describe("articleInputSchema and publishProblems", () => {
  it("accepts a valid article and rejects a bad slug or a non-fact fact status", () => {
    expect(articleInputSchema.parse({ ...base, slug: "a-title" }).slug).toBe("a-title");
    expect(articleInputSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    const wrong = articleInputSchema.safeParse({ ...base, factStatus: "confirmed" });
    expect(wrong.success).toBe(false);
    if (!wrong.success) expect(articleFieldErrors(wrong.error).factStatus).toMatch(/Only facts/);
  });

  it("validates sources and the schedule", () => {
    const source = { title: "Official site", url: "https://example.com/news", accessed_at: "2026-11-18" };
    expect(articleInputSchema.parse({ ...base, sources: [source] }).sources).toHaveLength(1);
    expect(articleInputSchema.safeParse({ ...base, sources: [{ ...source, accessed_at: "18/11/2026" }] }).success).toBe(
      false,
    );
    expect(articleInputSchema.safeParse({ ...base, publishAt: "2026-11-19T00:00:00+05:30" }).success).toBe(true);
    expect(articleInputSchema.safeParse({ ...base, publishAt: "tomorrow" }).success).toBe(false);
  });

  it("requires a summary and a body to publish", () => {
    const article = articleInputSchema.parse({ ...base, summary: "", body: " " });
    expect(Object.keys(publishProblems(article)).sort()).toEqual(["body", "summary"]);
  });

  it("applies rule 7 to facts: a status, a source when confirmed, two when verified", () => {
    const fact = (extra: object) => articleInputSchema.parse({ ...base, type: "fact", ...extra });
    expect(publishProblems(fact({})).factStatus).toBeDefined();
    expect(publishProblems(fact({ factStatus: "confirmed" })).sources).toMatch(/official source/);
    const one = [{ title: "S", url: "https://example.com", accessed_at: "2026-11-18" }];
    expect(publishProblems(fact({ factStatus: "confirmed", sources: one }))).toEqual({});
    expect(publishProblems(fact({ factStatus: "verified", sources: one })).sources).toMatch(/two sources/);
    expect(publishProblems(fact({ factStatus: "community" }))).toEqual({});
  });
});

describe("isOwnCoverUrl", () => {
  const supabase = "https://abc.supabase.co";
  it("accepts only our article-images bucket", () => {
    expect(isOwnCoverUrl(`${supabase}/storage/v1/object/public/article-images/x/y.webp`, supabase)).toBe(true);
    expect(isOwnCoverUrl(`${supabase}/storage/v1/object/public/avatars/x.webp`, supabase)).toBe(false);
    expect(isOwnCoverUrl("https://evil.example/article-images/x.webp", supabase)).toBe(false);
    expect(isOwnCoverUrl("", supabase)).toBe(false);
  });
});

describe("launch facts", () => {
  const source = "https://example.com/official";

  it("needs a source for every item", () => {
    expect(launchFactsSchema.safeParse({ platforms: [{ name: "PS5" }] }).success).toBe(false);
    expect(launchFactsSchema.safeParse({ platforms: [{ name: "PS5", source_url: source }] }).success).toBe(true);
    expect(
      launchFactsSchema.safeParse({ editions: [{ name: "Standard", price: "$69.99", source_url: source }] }).success,
    ).toBe(true);
    expect(launchFactsSchema.safeParse({ release_at: "2026-11-19T00:00:00Z" }).success).toBe(false);
    expect(
      launchFactsSchema.safeParse({ release_at: "2026-11-19T00:00:00Z", release_source_url: source }).success,
    ).toBe(true);
  });

  it("falls back to the empty skeleton for malformed stored values, including the Phase 2 seed", () => {
    expect(parseStoredLaunchFacts({ platforms: "nope" })).toEqual(EMPTY_LAUNCH_FACTS);
    const seeded = parseStoredLaunchFacts({
      release_at: null,
      platforms: [],
      editions: [],
      preload: null,
      download_size: null,
    });
    expect(seeded).toEqual(EMPTY_LAUNCH_FACTS);
    expect(hasLaunchFacts(seeded)).toBe(false);
  });
});
