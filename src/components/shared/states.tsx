import { TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** h1 when the state IS the page (404, route errors); h2/h3 inside a page. */
type HeadingLevel = "h1" | "h2" | "h3";

/**
 * A real empty state (SPEC §3: every block must look intentional with zero content):
 * an icon, what will appear here, and something useful to do meanwhile.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  as: Heading = "h2",
  compact = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  as?: HeadingLevel;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed bg-surface/40 text-center",
        compact ? "px-5 py-8" : "px-6 py-12 sm:py-16",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-full border border-pink/30 bg-pink/12 text-pink-text">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <Heading className="mt-4 text-lg font-semibold">{title}</Heading>
      {description ? <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Something failed: say so plainly and offer a way forward (retry / go home). */
export function ErrorState({
  title = "Something went wrong",
  description = "This part of the page didn't load. Try again, or come back in a minute.",
  actions,
  as: Heading = "h2",
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  as?: HeadingLevel;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-full border border-destructive/30 bg-destructive/12 text-destructive">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </div>
      <Heading className="mt-4 text-lg font-semibold">{title}</Heading>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
