import { cn } from "@/lib/utils";

/** Centered card for the sign-in and onboarding pages. Holds the page's single h1. */
export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="page-container flex justify-center py-8 sm:py-14">
      <div
        className={cn(
          "w-full max-w-md overflow-hidden rounded-[14px] border bg-surface dusk-top p-5 shadow-sm sm:p-8",
          className,
        )}
      >
        <header className="mb-6 space-y-2">
          {eyebrow ? (
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <span className="size-1.5 rounded-full bg-dusk" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground sm:text-base">{description}</p> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
