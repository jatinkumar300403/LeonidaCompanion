import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteShell>
      <div className="page-container py-16 sm:py-24">
        <EmptyState
          as="h1"
          icon={Compass}
          title="This page isn't on the map"
          description="The link may be old, or the page hasn't been published yet."
          actions={
            <>
              <Button asChild>
                <Link href="/">Go home</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/ask">
                  <Sparkles aria-hidden="true" />
                  Ask AI instead
                </Link>
              </Button>
            </>
          }
        />
      </div>
    </SiteShell>
  );
}
