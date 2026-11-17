"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { subscribeToNewsletter, type SubscribeState } from "@/server/newsletter/actions";

/**
 * Email sign-up for the weekly digest or the Online waitlist (SPEC §9), with double opt-in.
 * While email isn't configured the form renders disabled with an honest "opens soon" note.
 * The Turnstile widget mounts on first focus, so pages with the footer form don't load
 * Cloudflare's script until someone actually starts typing.
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
  const [state, formAction, pending] = useActionState<SubscribeState, FormData>(subscribeToNewsletter, {
    status: "idle",
  });
  const [engaged, setEngaged] = useState(false);

  if (state.status === "sent") {
    return (
      <p
        role="status"
        className={cn("flex items-start gap-2 text-sm text-teal-text", className)}
        data-testid="newsletter-sent"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {state.message}
      </p>
    );
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset(formAction)}
      onFocusCapture={() => setEngaged(true)}
      className={cn("w-full", className)}
      aria-describedby={enabled ? (error ? noteId : undefined) : noteId}
    >
      <input type="hidden" name="list" value={list} />
      <fieldset disabled={!enabled || pending} className="flex flex-col gap-2 sm:flex-row">
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
          maxLength={254}
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          className="sm:flex-1"
        />
        <Button type="submit" className="shrink-0">
          {pending ? "Sending…" : submitLabel}
        </Button>
      </fieldset>
      {enabled && engaged ? (
        <div className="mt-2">
          <TurnstileField action="newsletter" />
        </div>
      ) : null}
      {!enabled ? (
        <p id={noteId} className="mt-2 text-xs text-muted-foreground">
          Sign-ups open soon.
        </p>
      ) : error ? (
        <p id={noteId} role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
