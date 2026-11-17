"use client";

import Link from "next/link";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-container py-16">
      <ErrorState
        as="h1"
        actions={
          <>
            <Button onClick={() => reset()}>Try again</Button>
            <Button asChild variant="secondary">
              <Link href="/">Go home</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
