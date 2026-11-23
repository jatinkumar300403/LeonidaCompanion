import type { Metadata } from "next";
import { SavedPages } from "@/components/pwa/saved-pages";
import { PageHeader } from "@/components/shared/headers";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "You're offline",
    path: "/offline",
    noindex: true,
    description: "No connection right now. Guides you've opened before are still here.",
  });
}

/**
 * Offline fallback (SPEC §13 PWA, D-095). The service worker precaches this page and shows it for
 * any page it can't fetch or find in its cache.
 */
export default function OfflinePage() {
  return (
    <div className="page-container max-w-3xl py-10 sm:py-14">
      <PageHeader
        eyebrow="Offline"
        title="You're offline"
        description="We can't reach the internet right now. Guides you've opened before are saved on this device."
      />
      <SavedPages />
    </div>
  );
}
