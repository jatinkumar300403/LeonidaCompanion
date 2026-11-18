import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ROLE_LABELS } from "@/config/auth";
import { siteConfig } from "@/config/site";
import { integrations } from "@/env";
import { requireRole } from "@/server/auth/session";

// No `title` here: a plain string would drop the root "%s | {SiteName}" template for admin pages.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Staff only (SPEC §10): moderators and admins. Everyone else gets a plain 404 and signed-out
 * visitors go to /sign-in (requireRole). Without Supabase there are no staff, so it 404s.
 * Admin-only screens call requireRole("admin") themselves.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!integrations.supabase) notFound();
  const { profile } = await requireRole("mod", "/admin");
  const nav: AdminNavItem[] = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/clips", label: "Clips" },
  ];
  if (profile.role === "admin") {
    nav.push({ href: "/admin/articles", label: "Articles" }, { href: "/admin/launch", label: "Launch Hub" });
  }
  if (process.env.NODE_ENV === "development") nav.push({ href: "/admin/ui", label: "UI showcase" });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="page-container flex h-14 items-center gap-3">
          <Logo compact />
          <span className="rounded-full border border-violet/30 bg-violet/12 px-2 text-xs leading-5 font-semibold whitespace-nowrap text-violet-text">
            {ROLE_LABELS[profile.role]}
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
        <AdminNav items={nav} />
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
