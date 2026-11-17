"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { isActivePath } from "@/config/nav";
import { cn } from "@/lib/utils";

/**
 * Desktop header link with the gradient underline motif and aria-current on the active page.
 * Takes plain props (no icon component) because it is rendered from a Server Component.
 */
export function NavLink({ href, label, badge }: { href: Route; label: string; badge?: string }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 link-dusk py-1 text-sm font-medium whitespace-nowrap transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {badge ? (
        <span className="rounded-full border border-violet/30 bg-violet/12 px-1.5 text-[0.6875rem] leading-4 font-semibold text-violet-text">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
