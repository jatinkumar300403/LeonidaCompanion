import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site";

// No `title` here: a plain string would drop the root "%s | {SiteName}" template for admin pages.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Phase 1: the admin area exists only under `next dev` (D-032). Phase 2 replaces this check
 * with requireRole('mod') once auth exists.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="page-container flex h-14 items-center gap-3">
          <Logo compact />
          <span className="rounded-full border border-violet/30 bg-violet/12 px-2 text-xs leading-5 font-semibold whitespace-nowrap text-violet-text">
            Admin<span className="hidden sm:inline"> · dev only</span>
          </span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to site</span>
              <span className="sm:hidden">Site</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <footer className="border-t">
        <p className="page-container py-6 text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
      </footer>
    </div>
  );
}
