import { describe, expect, it } from "vitest";
import { isValidSlug, SLUG_MAX, slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases, strips accents and punctuation, joins words with single dashes", () => {
    expect(slugify("How to Lose a Wanted Level — Fast!")).toBe("how-to-lose-a-wanted-level-fast");
    expect(slugify("Café & Crème: déjà vu")).toBe("cafe-and-creme-deja-vu");
    expect(slugify("Don't panic")).toBe("dont-panic");
    expect(slugify("  --Spaces   everywhere--  ")).toBe("spaces-everywhere");
    expect(slugify("5★ wanted level 🚓 tips")).toBe("5-wanted-level-tips");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("🚓🚓")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("caps the length at a word boundary and always matches the database check", () => {
    const long = slugify("word ".repeat(80));
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(long.endsWith("-")).toBe(false);
    expect(isValidSlug(long)).toBe(true);
    for (const title of ["A", "Ünïcödé Tïtlé", "x-".repeat(100), "1 2 3", "a__b..c"]) {
      const slug = slugify(title);
      if (slug) expect(isValidSlug(slug)).toBe(true);
    }
  });
});

describe("isValidSlug", () => {
  it("mirrors the database pattern", () => {
    expect(isValidSlug("good-slug-2")).toBe(true);
    expect(isValidSlug("Bad")).toBe(false);
    expect(isValidSlug("double--dash")).toBe(false);
    expect(isValidSlug("-lead")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a".repeat(SLUG_MAX + 1))).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("adds the first free numeric suffix", () => {
    expect(uniqueSlug("tip", [])).toBe("tip");
    expect(uniqueSlug("tip", ["tip"])).toBe("tip-2");
    expect(uniqueSlug("tip", ["tip", "tip-2", "tip-3"])).toBe("tip-4");
    expect(uniqueSlug("", [])).toBe("article");
  });

  it("keeps a suffixed slug within the length limit", () => {
    const base = "a".repeat(SLUG_MAX);
    const slug = uniqueSlug(base, [base]);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(slug.endsWith("-2")).toBe(true);
    expect(isValidSlug(slug)).toBe(true);
  });
});
