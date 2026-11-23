import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";
import { LEGAL_DRAFT_UPDATED } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Terms of use",
    path: "/terms",
    description: "The rules for using the site and posting content, in plain English.",
  });
}

/** SPEC §14: a plain-English draft (16+, content licence, prohibited content, termination). */
const POLICY = `
These terms are the agreement between you and ${siteConfig.name} when you use the site. By using it, you agree to them.

## 1. The site

${siteConfig.name} is a free, unofficial fan site about GTA VI (see the [Disclaimer](/disclaimer)). We may add, change or remove features at any time, and the site may sometimes be unavailable.

## 2. Accounts

- You must be **16 or older** to create an account.
- One person per account. Keep access to your sign-in email safe: you're responsible for what happens on your account.
- Choose your username carefully: it can't be changed later. Usernames that impersonate someone or are offensive may be removed.

## 3. Your content

- **You keep ownership** of what you post.
- You give us a worldwide, non-exclusive, royalty-free licence to host, store, show, copy and format your content (for example to excerpt or resize it) so we can run and show the site.
- If your forum reply is marked as the **accepted answer**, you also let us use it as a source for Ask AI answers, which link back to your post.
- The licence ends when you delete the content, except for copies already shared or cached, and records we keep for moderation.
- You confirm you have the right to post what you post.

## 4. What's not allowed

Follow the [Community guidelines](/community-guidelines). In short, don't post:

- anything illegal, or that infringes someone's copyright or other rights;
- harassment, hate, threats, or sexual content;
- spam, scams or advertising;
- cheats, exploits, mods, money glitches, piracy or leaked material;
- other people's personal information;
- story spoilers without a spoiler tag.

Don't try to break, overload or scrape the site, get around its limits, or use it to collect information about other people.

## 5. Clips

Clips are shown only through the platforms' official players: we never download or re-upload videos, and each video belongs to its creator. When you submit a link, you confirm it's a gameplay moment that follows the guidelines (no isolated cutscenes or endings). Creators can ask us to remove a clip with the [removal form](/dmca).

## 6. Moderation and ending accounts

Automatic checks and moderators may hold, remove or restore content, lock or move threads, and suspend or close accounts that break these terms or the guidelines. You can delete your account at any time in [Settings](/settings). If you think we got something wrong, [contact us](/contact).

## 7. Information and AI answers

Guides, facts and AI answers are written to help, but they can be wrong or out of date, especially right after launch. AI answers cite their sources and can still make mistakes. Check anything important for yourself.

## 8. Other people's rights

If you believe something here infringes your rights, use the [removal form](/dmca). We may close the accounts of people who repeatedly post infringing content.

## 9. No warranty

The site is free and provided "as is", without warranties. As far as the law allows, we aren't liable for indirect losses, for content other people post, or for other websites and services we link to or embed. Nothing in these terms takes away rights you have by law where you live that can't be excluded.

## 10. Changes

We may update these terms. When we do, we change the date at the top, and for big changes we tell signed-in members. If you keep using the site after a change, the new terms apply.

## 11. Contact

Questions about these terms? [Contact us](/contact).
`;

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      description="The rules for using the site and posting content."
      updated={LEGAL_DRAFT_UPDATED}
      source={POLICY}
    />
  );
}
