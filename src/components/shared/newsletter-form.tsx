import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Email sign-up for the weekly digest or the Online waitlist (SPEC §9). Phase 3 wires the
 * double opt-in Server Action; until then (or while Resend/Supabase are missing) the form
 * renders disabled with an honest "opens soon" note instead of pretending to work.
 */
export function NewsletterForm({
  enabled,
  list = "digest",
  submitLabel = "Subscribe",
  className,
}: {
  enabled: boolean;
  list?: "digest" | "online_waitlist";
  submitLabel?: string;
  className?: string;
}) {
  const id = useId();
  const inputId = `${id}-email`;
  const noteId = `${id}-note`;

  return (
    <form className={cn("w-full", className)} aria-describedby={enabled ? undefined : noteId}>
      <input type="hidden" name="list" value={list} />
      <fieldset disabled={!enabled} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <Input
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          className="sm:flex-1"
        />
        <Button type="submit" className="shrink-0">
          {submitLabel}
        </Button>
      </fieldset>
      {enabled ? null : (
        <p id={noteId} className="mt-2 text-xs text-muted-foreground">
          Sign-ups open soon.
        </p>
      )}
    </form>
  );
}
