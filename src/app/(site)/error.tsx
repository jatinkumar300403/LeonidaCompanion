"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/monitoring/client";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error), [error]);

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
