import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

/**
 * The 404 body. The root not-found wraps it in the site shell (unknown URLs render under the root
 * layout only); the route groups' not-found files use it bare, because their own layout already
 * draws the header and footer (Phase 10, D-109).
 */
export function NotFoundContent() {
  return (
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
  );
}
