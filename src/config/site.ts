import { publicEnv } from "@/env.client";

/**
 * The site's identity. The name lives ONLY here (override with NEXT_PUBLIC_SITE_NAME);
 * never hard-code it anywhere else (CLAUDE.md).
 */
const name = publicEnv.siteName ?? "Leonida Atlas";

export const siteConfig = {
  name,
  /** Home-screen label (PWA manifest): the name itself if short, else its first word. */
  shortName: name.length <= 12 ? name : (name.split(/\s+/)[0] ?? name).slice(0, 12),
  tagline: "Your unofficial guide to GTA VI",
  description:
    "Unofficial GTA 6 guide and community: tips, features explained, sourced facts, AI answers with citations, a help forum and the best clips.",
  url: publicEnv.siteUrl,
  /** Every host the site runs on (Twitch embeds need each one as `parent`). */
  hosts: publicEnv.siteHosts,
  showImpressum: publicEnv.showImpressum,
  /** Public contact address (NEXT_PUBLIC_CONTACT_EMAIL); unset until the domain exists (Q4). */
  contactEmail: publicEnv.contactEmail,
  locale: "en_US",
  platformsLabel: "PS5 & Xbox Series X|S",
  /** CLAUDE.md rule 3: shown on every page, word for word. */
  disclaimer:
    "Unofficial fan site. Not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and related marks are trademarks of Take-Two Interactive.",
} as const;

/**
 * GTA VI launch: Thursday 19 November 2026 at 00:00 in the viewer's own time zone (D-020).
 * No UTC offset on purpose: `new Date(LAUNCH_AT)` parses it as local time in the browser.
 * An official instant in site_settings.launch_facts.release_at will override it (Phase 3).
 */
export const LAUNCH_AT = "2026-11-19T00:00:00";

/** Starter questions under the AskBox (questions only; answers come from cited sources). */
export const SUGGESTED_QUESTIONS = [
  "What time does GTA 6 unlock in my time zone?",
  "How do I lose a wanted level fast?",
  "Which platforms is GTA 6 on?",
  "Which settings should I change first?",
] as const;
