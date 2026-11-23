import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";
import { LEGAL_DRAFT_UPDATED } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Privacy",
    path: "/privacy",
    description: "What we collect, why, who helps us run the site, and how to export or delete your data.",
  });
}

/**
 * SPEC §14: a plain-English draft that describes what the code actually does (D-097). The owner
 * reviews it and adds who runs the site (the data controller) before it's final.
 */
const POLICY = `
${siteConfig.name} is an unofficial fan site about GTA VI. This page explains what we collect, why, who helps us run the site, and what you can do about it.

## The short version

- You can read everything without an account.
- We don't sell your data, show ads, or use tracking or advertising cookies.
- Our analytics don't use cookies and count visits, not people.
- You can download or delete your account data at any time in [Settings](/settings).

## What we collect

### When you visit

- **Request data.** Our hosting provider processes your IP address and browser details to deliver pages and block abuse. We don't store IP addresses: where we limit how often something can be done (sign-ups, forms, votes), we keep a salted one-way hash for at most a day.
- **Cookieless analytics.** Vercel Web Analytics counts page views and a few anonymous events, such as "a clip was played" or "a newsletter sign-up was sent". It doesn't use cookies and doesn't identify you.
- **Things your browser keeps.** Your theme, whether you agreed to load video players, your "Was this helpful?" votes, the install suggestion and guides saved for offline reading stay in your own browser, not on our servers.
- **One cookie for anonymous votes.** If you vote "Was this helpful?" without an account, we set a cookie with a random id so the same browser can't vote twice. It holds nothing about you.

### When you create an account

- **Account details:** your email address (for signing in), username, display name, optional bio and avatar, platform, notification settings, and when you confirmed you're 16 or older and accepted the [Terms](/terms).
- **Sign-in cookies** that keep you signed in. They're strictly necessary, so there's no consent banner for them.
- **What you post and do:** threads, replies, votes, clips you submit, reports and blocks.
- If you sign in with Google or Discord, we receive your email address and basic profile from them.

### When you send us something

Removal requests, messages and newsletter sign-ups include your name or email address and what you wrote. We keep them so we can handle the request and keep a record of it. Newsletter emails start only after you confirm your address.

## Why we use it

- To run the site and your account, as set out in the [Terms](/terms).
- To keep the community safe: spam and abuse checks, moderation, rate limits and bot checks.
- To understand, in total and without cookies, which pages help people.
- To send the emails you asked for. You can stop them at any time.

## Automatic checks and AI

New threads, replies, clips and profile text get an automatic check before they go live, to catch spam, harassment, untagged spoilers and similar problems. Some posts then wait for a human moderator. See [how moderation works](/community-guidelines).

When Ask AI is available, the question you type is sent to our AI provider to write the answer. Please don't put personal details in questions.

## Who helps us run the site

These providers process data for us, only to provide their service:

| Provider | What for |
| --- | --- |
| Supabase | Database, accounts, sign-in and file storage |
| Vercel | Hosting and cookieless analytics |
| Anthropic | Automatic moderation checks and Ask AI answers |
| Voyage AI | Turning our guides and accepted forum answers into search data for Ask AI |
| Resend | Sending emails |
| Upstash | Rate limits and short-lived caches |
| Cloudflare | Turnstile bot checks on forms |
| Sentry | Error reports, so we can fix bugs |

Some of them process data outside your country, including in the United States. Where the law requires it, transfers rely on safeguards such as standard contractual clauses.

**Clips** are YouTube, Twitch or TikTok players. Nothing loads from those platforms until you press play and agree. After that, the platform's own privacy policy applies, and it may set its own cookies.

## How long we keep it

- **Your account:** until you delete it.
- **After you delete your account:** your profile goes. Threads and replies you posted stay, shown as "[deleted user]", so conversations still make sense. Delete individual posts first if you want them gone.
- **Rate-limit hashes:** at most a day.
- **Reports and moderation records:** as long as they're needed to keep the site safe and handle appeals.
- **Error reports:** for the limited period Sentry keeps them.
- **Newsletter:** until you unsubscribe or ask us to remove you.

## Your rights

Depending on where you live (for example under the GDPR in the EU and UK), you can ask to see, correct, delete or export your data, object to some uses, or withdraw consent.

- **Export:** [Settings](/settings) → Export my data.
- **Delete:** [Settings](/settings) → Delete account.
- **Anything else:** [contact us](/contact).

You can also complain to your local data protection authority.

## Children

The site is for people aged 16 and over. If you think someone younger has an account, [contact us](/contact) and we'll remove it.

## Changes

When this page changes in a way that matters, we update the date at the top. For big changes, we also tell signed-in members.
`;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      description="What we collect, why, and how to export or delete your data."
      updated={LEGAL_DRAFT_UPDATED}
      source={POLICY}
    />
  );
}
