import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_FLAGS, FLAG_KEYS } from "@/server/flags";
import { RESERVED_USERNAMES, USERNAME_PATTERN } from "./auth";
import { TAGS } from "./tags";

/** supabase/seed.sql must carry the same tags and reserved usernames as the TypeScript config. */
const seed = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8");

function valuesAfter(marker: string): string[] {
  const block = seed.split(marker)[1]?.split("on conflict")[0] ?? "";
  return [...block.matchAll(/\(\s*'([^']+)'/g)].map((match) => match[1]);
}

describe("seed.sql stays in step with src/config", () => {
  it("seeds every tag in order", () => {
    expect(valuesAfter("insert into public.tags")).toEqual(TAGS.map((tag) => tag.slug));
  });

  it("seeds every reserved username", () => {
    expect(valuesAfter("insert into public.reserved_usernames").sort()).toEqual([...RESERVED_USERNAMES].sort());
  });

  it("reserved usernames are themselves valid usernames (otherwise reserving them is pointless)", () => {
    for (const name of RESERVED_USERNAMES) {
      if (name.length >= 3) expect(name).toMatch(USERNAME_PATTERN);
    }
  });

  it("seeds the eight SPEC §5 forum categories with the Online category locked", () => {
    const categories = valuesAfter("insert into public.forum_categories");
    expect(categories).toEqual([
      "help",
      "tips",
      "missions-story",
      "online",
      "clips-moments",
      "bugs-performance",
      "general",
      "site-feedback",
    ]);
    expect(seed).toMatch(/\('online', 'Online', '[^']*', 4, false, true, false\)/);
  });

  it("seeds every feature flag off (D-018, D-085)", () => {
    const row = seed.match(/\('flags', '(\{[^']*\})'\)/);
    expect(row).not.toBeNull();
    expect(JSON.parse(row![1]!)).toEqual(DEFAULT_FLAGS);
    expect(Object.keys(DEFAULT_FLAGS)).toEqual([...FLAG_KEYS]);
  });
});
