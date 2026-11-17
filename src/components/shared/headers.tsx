import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Top of a page: eyebrow, the page's single h1, an intro line and optional actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {eyebrow ? (
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          <span className="size-1.5 rounded-full bg-dusk" aria-hidden="true" />
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      {description ? <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

/** Section title row with an optional "View all" link (SPEC §2 SectionHeader). */
export function SectionHeader({
  title,
  description,
  href,
  linkLabel = "View all",
  id,
  className,
}: {
  title: string;
  description?: string;
  href?: Route;
  linkLabel?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-semibold sm:text-2xl">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 link-dusk text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
