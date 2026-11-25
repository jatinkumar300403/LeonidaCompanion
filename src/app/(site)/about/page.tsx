import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

/** When this page's draft text last changed (owner review pending, like the legal drafts). */
const ABOUT_UPDATED = "25 November 2026";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "About",
    path: "/about",
    description: "An unofficial, fan-made GTA VI guide and community: what's here and how it works.",
  });
}

/**
 * SPEC §1 /about (Phase 10, D-107): what the site is and how it works, in plain English. It
 * describes the site only, never the game, so it holds no tips or facts (CLAUDE.md "Don'ts").
 */
function aboutSource(name: string): string {
  return `
${name} is an unofficial, fan-made companion for GTA VI. It's run by fans, not by Rockstar Games or Take-Two Interactive.

## What's here

- **[Tips](/tips), [Features explained](/features) and [Facts](/facts):** short guides written and checked by the team. Every fact carries a badge: **confirmed** links to an official source, **verified** was checked by staff against two or more sources, and **community** comes from the forum. Rumours are never published as facts.
- **[The help forum](/forum):** ask questions, answer them and mark the answer that worked.
- **[Clips](/clips):** great moments from players, shown only through the official Twitch, YouTube and TikTok players. Nothing is downloaded or re-uploaded, and every clip credits its creator.
- **[The launch hub](/launch):** release details as they're officially announced.

## Spoilers

Story spoilers are hidden until you choose to reveal them, everywhere on the site. Tag your own with \`||spoiler||\`.

## How we keep it useful

Moderators review reports, and new accounts have a few limits while they find their feet. We don't allow cheats, exploits, money glitches, mods for online modes or leaks. The [community guidelines](/community-guidelines) explain the rules.

## Your data

There are no ad or tracking cookies. You can download or delete everything you've posted from [Settings](/settings) at any time. See [Privacy](/privacy) for the details.

## Credits and contact

Wherever we use text from a wiki, it's under that wiki's licence, with attribution on the page that uses it. [Credits](/credits) lists the sources. To get something of yours taken down, use the [removal form](/dmca). For anything else, see [Contact](/contact).
`;
}

export default function AboutPage() {
  return (
    <LegalPage
      eyebrow="About"
      title={`About ${siteConfig.name}`}
      description="An unofficial, fan-made GTA VI guide and community."
      updated={ABOUT_UPDATED}
      source={aboutSource(siteConfig.name)}
    />
  );
}
