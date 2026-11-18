import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ClipSubmitForm } from "@/components/clips/clip-submit-form";
import { Notice } from "@/components/shared/form-bits";
import { PageHeader } from "@/components/shared/headers";
import { siteConfig } from "@/config/site";
import { integrations } from "@/env";
import { PLATFORM_LABELS, serverParentHosts } from "@/lib/clips/embed";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth/session";
import { clipPlatformAvailability } from "@/server/clips/resolve";
import type { ClipPlatform } from "@/types/content";

/** /clips/submit (SPEC §1, §6): signed-in members only; noindex. */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Submit a clip",
    path: "/clips/submit",
    description: "Share a GTA 6 clip from Twitch, YouTube or TikTok.",
    noindex: true,
  });
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export default async function SubmitClipPage() {
  await requireUser("/clips/submit");
  const available = clipPlatformAvailability();
  const closed = (Object.keys(available) as ClipPlatform[]).filter((platform) => !available[platform]);
  const open = (Object.keys(available) as ClipPlatform[]).filter((platform) => available[platform]);

  return (
    <div className="page-container max-w-3xl py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/clips" className="hover:text-foreground">
              Clips
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="text-foreground">
            Submit
          </li>
        </ol>
      </nav>

      <PageHeader
        className="mt-4"
        eyebrow="Clips"
        title="Submit a clip"
        description="Share a funny, epic or fail-worthy GTA VI moment. We show it through the platform's own player and credit the creator; nothing is re-uploaded."
      />

      <div className="mt-8">
        {!integrations.supabaseAdmin ? (
          <Notice tone="info" title="Clip submissions aren't open yet">
            Please check back soon.
          </Notice>
        ) : (
          <div className="flex flex-col gap-6">
            {closed.length > 0 ? (
              <Notice
                tone="info"
                title={`${joinNames(closed.map((platform) => PLATFORM_LABELS[platform]))} links aren't open yet`}
              >
                We can&apos;t check those links yet. {joinNames(open.map((platform) => PLATFORM_LABELS[platform]))}{" "}
                links work now.
              </Notice>
            ) : null}
            <ClipSubmitForm parentHosts={serverParentHosts(siteConfig.hosts)} />
          </div>
        )}
      </div>
    </div>
  );
}
