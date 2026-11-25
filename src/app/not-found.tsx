import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/site-shell";
import { NotFoundContent } from "@/components/shared/not-found-content";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** Unknown URLs: rendered under the root layout only, so it brings the site shell itself. */
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundContent />
    </SiteShell>
  );
}
