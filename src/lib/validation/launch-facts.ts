import { z } from "zod";
import { webUrl } from "@/lib/validation/article";

/**
 * site_settings.launch_facts (SPEC §4 Launch Hub): release date/time, platforms, editions with
 * prices, preload info and download size. Every item carries its source URL.
 */

const text = (max: number, label: string) =>
  z.string().trim().min(1, `Add the ${label}.`).max(max, `The ${label} can be at most ${max} characters.`);

const optionalText = (max: number) => z.string().trim().max(max).default("");

export const launchPlatformSchema = z.object({
  name: text(60, "platform name"),
  source_url: webUrl,
});

export const launchEditionSchema = z.object({
  name: text(80, "edition name"),
  price: text(40, "price"),
  contents: optionalText(400),
  source_url: webUrl,
});

export const launchFactsSchema = z
  .object({
    /** Official release instant (ISO with offset). Overrides LAUNCH_AT for the countdown (D-020). */
    release_at: z.iso.datetime({ offset: true }).nullable().default(null),
    release_note: optionalText(200),
    release_source_url: z.union([z.literal(""), webUrl]).default(""),
    platforms: z.array(launchPlatformSchema).max(10).default([]),
    editions: z.array(launchEditionSchema).max(10).default([]),
    preload: z
      .object({ text: text(300, "preload details"), starts_at: optionalText(40), source_url: webUrl })
      .nullable()
      .default(null),
    download_size: z
      .object({ value: text(60, "download size"), source_url: webUrl })
      .nullable()
      .default(null),
  })
  .superRefine((facts, ctx) => {
    if (facts.release_at && !facts.release_source_url) {
      ctx.addIssue({ code: "custom", path: ["release_source_url"], message: "The release time needs its source." });
    }
  });

export type LaunchFacts = z.infer<typeof launchFactsSchema>;

export const EMPTY_LAUNCH_FACTS: LaunchFacts = {
  release_at: null,
  release_note: "",
  release_source_url: "",
  platforms: [],
  editions: [],
  preload: null,
  download_size: null,
};

/** Reads whatever is stored; anything malformed falls back to the empty skeleton. */
export function parseStoredLaunchFacts(value: unknown): LaunchFacts {
  const parsed = launchFactsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : EMPTY_LAUNCH_FACTS;
}

export function hasLaunchFacts(facts: LaunchFacts): boolean {
  return Boolean(
    facts.release_at || facts.platforms.length || facts.editions.length || facts.preload || facts.download_size,
  );
}
