import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";
import { LEGAL_DRAFT_UPDATED } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Disclaimer",
    path: "/disclaimer",
    description: "This is an unofficial fan site, not affiliated with Rockstar Games or Take-Two Interactive.",
  });
}

/** SPEC §14: a plain-English draft. CLAUDE.md rule 3's wording is quoted exactly. */
const POLICY = `
**${siteConfig.disclaimer}**

## Made by fans

${siteConfig.name} is an independent fan project. Nothing here is made, checked or approved by Rockstar Games or Take-Two Interactive. "Grand Theft Auto", "GTA VI", "Rockstar Games" and related names are trademarks of their owners. We use them only to say what the site is about. We don't use the official logo, key art or fonts, and all artwork here is our own.

## Information can be wrong

GTA VI news moves fast, especially around launch. We check what we publish, but mistakes happen and things change with updates.

- **Facts** carry a status badge: **Confirmed** (an official source is linked), **Verified** (checked by our staff against at least two sources) or **Community** (from the forum). Rumours are never published as facts.
- **AI answers** are written from our sources and always cite them. When the sources don't cover a question, the answer says "Not confirmed yet". AI can still make mistakes, so check anything important.
- **Forum posts and clips** come from members. They're their own views, not ours.

Spotted a mistake? [Tell us](/contact) and we'll fix it.

## Other sites and embedded players

Links to other websites, and the YouTube, Twitch and TikTok players that show clips, are there for convenience. We don't control those services or what they show. Clips belong to their creators; see the [Credits](/credits).

## No game files, cheats or leaks

We don't host game files, mods, cheats, exploits, money glitches or leaked material, and they aren't allowed in the community. See the [Community guidelines](/community-guidelines).
`;

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      description="An unofficial fan site: who we are, and how far you can rely on what you read here."
      updated={LEGAL_DRAFT_UPDATED}
      source={POLICY}
    />
  );
}
