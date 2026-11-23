import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Contact", path: "/contact", description: "How to reach the team behind the site." });
}

/**
 * SPEC §1/§14 contact page (D-097). The public address comes from NEXT_PUBLIC_CONTACT_EMAIL and
 * is shown only once it's set (it waits for the domain, Q4); it's never the admin's own address.
 */
function contactSource(email: string | undefined): string {
  const general = email
    ? `- **Privacy requests, corrections, press or anything else:** email [${email}](mailto:${email}).`
    : "- **Privacy requests, corrections, press or anything else:** our email address goes up here once the site's own domain is live. Until then, the [removal form](/dmca) reaches the moderators directly.";
  return `
${siteConfig.name} is run by fans, not by Rockstar Games or Take-Two Interactive, so we can't help with game purchases, accounts or support. For anything about this site:

- **Remove something of yours** (a clip, a post, your writing): use the [content removal form](/dmca). We usually act within 24 hours.
- **A post, clip or profile breaks the rules:** press **Report** on it. Moderators review every report, and the person isn't told who reported them.
${general}

For your data, [Settings](/settings) lets you download or delete everything at any time; see [Privacy](/privacy). The [Community guidelines](/community-guidelines) and [Credits](/credits) answer most other questions.
`;
}

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="About"
      title="Contact"
      description="How to reach the team behind the site."
      source={contactSource(siteConfig.contactEmail)}
    />
  );
}
