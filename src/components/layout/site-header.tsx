import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { mainNav } from "@/config/nav";
import { integrations } from "@/env";
import { getFlags } from "@/server/flags";

/**
 * Sticky header. From `lg` up: logo, main nav, search, theme, sign-in. Below `lg` it collapses to
 * logo + search + sign-in, and the bottom tab bar takes over navigation.
 * The account slot (Sign in / avatar menu) appears once Supabase is configured; it reads the session
 * in the browser so the shell stays static.
 */
export async function SiteHeader() {
  const flags = await getFlags();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="page-container flex h-14 items-center gap-6 lg:h-16">
        <Logo className="lg:hidden" compact />
        <Logo className="hidden lg:inline-flex" />

        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-6">
            {mainNav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  badge={item.href === "/online" && flags.FEATURE_ONLINE ? undefined : item.badge}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Button asChild variant="ghost" size="icon">
            <Link href="/search" aria-label="Search">
              <Search aria-hidden="true" />
            </Link>
          </Button>
          <ThemeToggle className="hidden lg:inline-flex" />
          {integrations.supabase ? <UserMenu /> : null}
        </div>
      </div>
    </header>
  );
}
