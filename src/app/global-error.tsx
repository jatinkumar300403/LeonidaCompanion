"use client";

import "./globals.css";
import { siteConfig } from "@/config/site";

/** Last-resort error page when the root layout itself fails. Sentry hooks in here in Phase 9. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-6 text-center text-foreground">
        <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">The page failed to load. Please try again.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="h-10 rounded-lg bg-dusk px-4 text-sm font-semibold text-on-accent"
        >
          Try again
        </button>
        <p className="max-w-xl text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
      </body>
    </html>
  );
}
