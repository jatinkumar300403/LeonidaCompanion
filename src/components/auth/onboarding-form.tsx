"use client";

import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { PlatformPicker } from "@/components/auth/platform-picker";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISPLAY_NAME_MAX, MIN_AGE, USERNAME_MAX, USERNAME_PATTERN } from "@/config/auth";
import { completeOnboarding, type OnboardingState } from "@/server/auth/actions";

type Check = { state: "idle" | "checking" | "available" | "unavailable" | "error"; message?: string };

/**
 * Live availability check: the format is checked locally first (no zod in the bundle), then the
 * server is asked after a short pause. Only the server answer lives in state; the rest is derived.
 */
function useUsernameCheck(raw: string): Check {
  const name = raw.trim().replace(/^@/, "").toLowerCase();
  const formatOk = USERNAME_PATTERN.test(name);
  const [remote, setRemote] = useState<{ name: string; check: Check } | null>(null);

  useEffect(() => {
    if (!formatOk) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/username?u=${encodeURIComponent(name)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as { available: boolean; reason: string | null };
        setRemote({
          name,
          check: result.available
            ? { state: "available", message: `@${name} is available.` }
            : { state: response.ok ? "unavailable" : "error", message: result.reason ?? "Not available." },
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setRemote({ name, check: { state: "error", message: "Couldn't check right now." } });
        }
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [name, formatOk]);

  if (!name) return { state: "idle" };
  if (!formatOk) return { state: "unavailable", message: "3–20 lowercase letters, numbers or underscores." };
  return remote?.name === name ? remote.check : { state: "checking" };
}

export function OnboardingForm({ next, suggestedName }: { next: string; suggestedName?: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {
    status: "idle",
  });
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(suggestedName ?? "");
  const [platform, setPlatform] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const check = useUsernameCheck(username);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // Server errors go stale once the user edits: the live check (or the ticked box) takes over.
  const usernameError =
    check.state === "unavailable"
      ? check.message
      : check.state === "idle" || check.state === "error"
        ? errors.username
        : undefined;
  const ageError = ageConfirmed ? undefined : errors.ageConfirmed;
  const termsError = termsAccepted ? undefined : errors.termsAccepted;

  return (
    <form action={formAction} onSubmit={submitWithoutReset(formAction)} className="space-y-6" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">@</span>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={USERNAME_MAX + 1}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            aria-invalid={usernameError ? true : undefined}
            aria-describedby="username-status"
            className="h-11 pr-10 pl-7"
          />
          <span className="absolute top-1/2 right-3 -translate-y-1/2" aria-hidden="true">
            {check.state === "checking" ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            {check.state === "available" ? <Check className="size-4 text-teal-text" /> : null}
            {check.state === "unavailable" ? <X className="size-4 text-destructive" /> : null}
          </span>
        </div>
        <p
          id="username-status"
          aria-live="polite"
          className={
            usernameError
              ? "text-sm text-destructive"
              : check.state === "available"
                ? "text-sm text-teal-text"
                : "text-sm text-muted-foreground"
          }
        >
          {usernameError ??
            (check.state === "available" || check.state === "error"
              ? check.message
              : "This is how people see you in the forum. You can't change it later.")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">
          Display name <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={errors.displayName ? "displayName-error" : undefined}
          className="h-11"
        />
        <FieldError id="displayName-error" message={errors.displayName} />
      </div>

      <PlatformPicker value={platform} onChange={setPlatform} />

      <div className="space-y-4 rounded-lg border bg-surface-2/60 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="ageConfirmed"
            name="ageConfirmed"
            checked={ageConfirmed}
            onCheckedChange={(value) => setAgeConfirmed(value === true)}
            aria-invalid={ageError ? true : undefined}
            aria-describedby={ageError ? "ageConfirmed-error" : undefined}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="ageConfirmed" className="leading-snug">
              I am {MIN_AGE} or older
            </Label>
            <FieldError id="ageConfirmed-error" message={ageError} />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="termsAccepted"
            name="termsAccepted"
            checked={termsAccepted}
            onCheckedChange={(value) => setTermsAccepted(value === true)}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? "termsAccepted-error" : undefined}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="termsAccepted" className="block leading-snug font-normal">
              I accept the{" "}
              <Link href="/terms" target="_blank" className="font-medium text-pink-text underline underline-offset-4">
                Terms
              </Link>{" "}
              and the{" "}
              <Link
                href="/community-guidelines"
                target="_blank"
                className="font-medium text-pink-text underline underline-offset-4"
              >
                Community Guidelines
              </Link>
            </Label>
            <FieldError id="termsAccepted-error" message={termsError} />
          </div>
        </div>
      </div>

      <TurnstileField action="onboarding" />

      {state.status === "error" ? <Notice tone="error" title={state.message} /> : null}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Creating your profile…" : "Finish sign-up"}
      </Button>
    </form>
  );
}
