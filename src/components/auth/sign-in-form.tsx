"use client";

import { Loader2, Mail } from "lucide-react";
import { useActionState, useState } from "react";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMagicLink, signInWithProvider, type MagicLinkState } from "@/server/auth/actions";

type Provider = "google" | "discord";

const PROVIDER_LABELS: Record<Provider, string> = { google: "Continue with Google", discord: "Continue with Discord" };

/** Magic-link form plus Google/Discord buttons (SPEC §9). One flow for sign-in and sign-up. */
export function SignInForm({ next, providers }: { next: string; providers: Provider[] }) {
  const [state, formAction, pending] = useActionState<MagicLinkState, FormData>(requestMagicLink, { status: "idle" });
  const [email, setEmail] = useState("");

  if (state.status === "sent") {
    return (
      <div className="space-y-4" data-testid="magic-link-sent">
        <Notice tone="success" title="Check your email">
          We sent a sign-in link to <strong className="text-foreground">{state.email}</strong>. Open it on this device
          to continue. It expires in an hour.
        </Notice>
        <p className="text-sm text-muted-foreground">
          No email after a few minutes? Check your spam folder, or{" "}
          <button
            type="button"
            className="font-medium text-pink-text underline underline-offset-4"
            onClick={() => window.location.reload()}
          >
            send a new link
          </button>
          .
        </p>
      </div>
    );
  }

  const emailError = state.status === "error" ? state.fieldErrors?.email : undefined;

  return (
    <div className="space-y-6">
      {providers.length > 0 ? (
        <>
          <div className="grid gap-3">
            {providers.map((provider) => (
              <form key={provider} action={signInWithProvider}>
                <input type="hidden" name="provider" value={provider} />
                <input type="hidden" name="next" value={next} />
                <Button type="submit" variant="secondary" className="h-11 w-full">
                  <ProviderIcon provider={provider} />
                  {PROVIDER_LABELS[provider]}
                </Button>
              </form>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form action={formAction} onSubmit={submitWithoutReset(formAction)} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "email-error" : "email-hint"}
            className="h-11"
          />
          {emailError ? (
            <FieldError id="email-error" message={emailError} />
          ) : (
            <p id="email-hint" className="text-sm text-muted-foreground">
              We&apos;ll email you a link. No password needed.
            </p>
          )}
        </div>

        <TurnstileField action="sign-in" />

        {state.status === "error" && !emailError ? <Notice tone="error" title={state.message} /> : null}

        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}
          {pending ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </form>
    </div>
  );
}

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#5865F2"
        d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.85a13.7 13.7 0 0 0-.63 1.29 18.4 18.4 0 0 0-5.53 0 12.6 12.6 0 0 0-.64-1.29 19.7 19.7 0 0 0-4.93 1.52C.53 9.05-.32 13.6.1 18.1a19.9 19.9 0 0 0 6.05 3.05c.49-.66.92-1.36 1.3-2.1a12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.18 0l.5.39c-.65.39-1.33.71-2.05.98.38.74.81 1.44 1.3 2.1a19.8 19.8 0 0 0 6.05-3.05c.5-5.2-.84-9.7-3.57-13.73zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.17 1.09 2.15 2.42 0 1.34-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.17 1.09 2.15 2.42 0 1.34-.94 2.42-2.15 2.42z"
      />
    </svg>
  );
}
