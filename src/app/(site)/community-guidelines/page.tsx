import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";
import { GUIDELINES_UPDATED } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Community guidelines",
    path: "/community-guidelines",
    description: "Be helpful, tag spoilers, and no cheats, exploits, leaks or harassment. How moderation works here.",
  });
}

/** SPEC §14: a plain-English draft. The owner reviews it before it's final. */

const GUIDELINES = `
${siteConfig.name} is a fan community for GTA VI players. These rules keep it useful and friendly. They apply to forum threads and replies, clips, captions, profiles and anything else you post here.

## 1. Be helpful and kind

- Answer the question that was asked, and say so when you're not sure.
- Disagree with ideas, not people. No insults, threats, bullying or pile-ons.
- No hate. Don't attack anyone for their race, ethnicity, religion, nationality, gender, sexual orientation, disability or similar traits.
- Keep it clean. No sexual content, and nothing sexual involving minors, ever.

## 2. Tag your spoilers

Story spoilers are hidden by default here, so people can play the game fresh.

- Wrap a spoiler in double bars: \`||like this||\`. It shows blurred until someone chooses to reveal it.
- For a whole thread about the story, tick **Contains spoilers**, or post in **Missions & Story**, where every post is behind a spoiler warning.
- Don't put spoilers in thread titles, clip titles or your profile.

If our automatic check thinks a post has an untagged spoiler, it asks you to add a tag and post again.

## 3. No cheats, exploits, leaks or piracy

This keeps the site safe for everyone, and keeps accounts out of trouble.

- No cheats, hacks, mod menus, trainers or money and duplication glitches, especially for online modes.
- No piracy, cracked copies or links to them.
- No leaked or datamined material, stolen builds or footage. Official news and confirmed information are fine.

Ordinary single-player tips, settings help and bug reports are welcome.

## 4. No spam or self-promotion

- Don't advertise, farm links or repeat the same post.
- Sharing your own content is fine when it answers the discussion, not as an ad.
- New accounts can't post links until they've been around a day and earned some reputation.

## 5. Respect privacy

Never share someone's personal information: home address, phone number, private email, real name against their wishes, or account details.

## 6. Clips

- Clips are shown only through the platforms' official players. We never download or re-upload videos.
- Share gameplay moments, not story. No isolated cutscenes or endings.
- Credit the creator. If it's your clip and you'd like it removed, use the removal link on the clip's page.

## 7. How moderation works

- **Automatic check.** New threads, replies, clips and profile bios get a quick automatic check before they go live. Most posts go straight up.
- **Pending review.** Some posts wait for a moderator first. You can still see your own post, marked *Pending review*, and it goes public once approved.
- **Reports.** Use **Report** on any thread, reply, clip or profile. Moderators review every report, and the person isn't told who reported them.
- **Blocking.** Block someone to hide their posts and stop their mentions and notifications.
- **Moderator actions.** Moderators can remove or restore posts, lock or move threads, and suspend accounts for a while or for good. You're notified when a moderator acts on your content, and every action is logged.

If you think we got something wrong, [contact us](/contact).

## 8. Look after yourself

If you're going through something hard, you don't have to deal with it alone. Please reach out to someone you trust, or to your local emergency number if you're in danger. Moderators see posts about self-harm quickly and will try to point you to help.

---

${siteConfig.name} is an unofficial fan site. Breaking these guidelines can mean removed posts or a suspended account. See also the [Terms](/terms), [Privacy](/privacy) and [Credits](/credits) pages, and the [removal form](/dmca) for creators.
`;

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      eyebrow="Community"
      title="Community guidelines"
      description="Be helpful, tag spoilers, and no cheats, exploits, leaks or harassment."
      updated={GUIDELINES_UPDATED}
      source={GUIDELINES}
    />
  );
}
