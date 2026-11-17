import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export type StubLink = { href: Route; label: string; primary?: boolean };

/**
 * Placeholder for routes whose real page arrives in a later phase, so navigation never 404s.
 * It shows the page title and an honest empty state with somewhere useful to go instead.
 */
export function StubPage({
  eyebrow,
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  links = [],
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: React.ReactNode;
  links?: StubLink[];
  children?: React.ReactNode;
}) {
  return (
    <div className="page-container py-10 sm:py-14">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children ? <div className="mt-8">{children}</div> : null}
      <EmptyState
        className="mt-8"
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
        actions={
          links.length > 0
            ? links.map((link) => (
                <Button key={link.href} asChild size="sm" variant={link.primary ? "default" : "secondary"}>
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))
            : undefined
        }
      />
    </div>
  );
}
