import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Big question box + suggested questions (SPEC §2/§3). A plain GET form to /ask, so it works
 * before (and without) JavaScript; Phase 8 streams the answer on /ask.
 */
export function AskBox({
  suggestions = [],
  defaultValue,
  size = "lg",
  className,
}: {
  suggestions?: readonly string[];
  defaultValue?: string;
  size?: "lg" | "md";
  className?: string;
}) {
  const id = useId();
  const inputId = `${id}-q`;
  const hintId = `${id}-hint`;
  const large = size === "lg";

  return (
    <div className={cn("w-full", className)}>
      <form action="/ask" method="get" role="search" aria-label="Ask AI">
        <label htmlFor={inputId} className="sr-only">
          Ask a question about GTA VI
        </label>
        <div className="relative">
          <Sparkles
            className={cn(
              "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-pink-text",
              large ? "size-5" : "size-4",
            )}
            aria-hidden="true"
          />
          <input
            id={inputId}
            name="q"
            type="text"
            required
            maxLength={300}
            autoComplete="off"
            enterKeyHint="search"
            defaultValue={defaultValue}
            aria-describedby={hintId}
            placeholder="Ask a GTA VI question…"
            className={cn(
              "w-full rounded-xl border border-input bg-surface text-foreground shadow-card transition-colors placeholder:text-muted-foreground",
              large ? "h-14 pr-28 pl-12 text-base sm:h-16 sm:text-lg" : "h-12 pr-24 pl-11 text-base",
            )}
          />
          <Button
            type="submit"
            size={large ? "default" : "sm"}
            className={cn("absolute top-1/2 right-2 -translate-y-1/2", large && "sm:h-11 sm:px-5")}
          >
            Ask
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <p id={hintId} className="mt-2 text-xs text-muted-foreground">
          Answers come from cited sources. If they don&apos;t cover it, you&apos;ll see &ldquo;Not confirmed yet&rdquo;.
        </p>
      </form>

      {suggestions.length > 0 ? (
        <div className="mt-4">
          <p className="sr-only">Suggested questions</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((question) => (
              <li key={question}>
                <Link
                  href={routes.ask(question)}
                  className="inline-flex min-h-9 items-center rounded-full border bg-surface/80 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-pink/40 hover:text-foreground"
                >
                  {question}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
