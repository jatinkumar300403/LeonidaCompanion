"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { publicEnv } from "@/env.client";
import { REMOVAL_LIMITS, REMOVAL_ROLE_LABELS, REMOVAL_ROLES, type RemovalRole } from "@/lib/validation/removal";
import { submitRemovalRequest, type RemovalState } from "@/server/legal/actions";

/**
 * The /dmca form (SPEC §14: name, email, URL, ownership statement; D-098). Coming from a clip's
 * "I'm the creator: remove this" link, the clip is pre-filled. Turnstile mounts on first focus,
 * so the page doesn't load Cloudflare's script until someone starts filling it in.
 */
export function RemovalForm({
  enabled,
  defaultUrl,
  clipId,
  clipTitle,
}: {
  enabled: boolean;
  defaultUrl?: string;
  clipId?: number;
  clipTitle?: string;
}) {
  const [state, formAction, pending] = useActionState<RemovalState, FormData>(submitRemovalRequest, {
    status: "idle",
  });
  const [engaged, setEngaged] = useState(false);
  const [role, setRole] = useState<RemovalRole | "">(clipId ? "creator" : "");
  const [statement, setStatement] = useState(false);

  if (state.status === "sent") {
    return (
      <Notice tone="success" title="Request received" className="mt-6">
        Thanks. A moderator will review it, usually within 24 hours, and reply by email if we need anything else.
      </Notice>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const describe = (field: string) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset(formAction)}
      onFocusCapture={() => setEngaged(true)}
      className="mt-6 space-y-6 rounded-xl border bg-surface p-5 sm:p-6"
      noValidate
      aria-labelledby="removal-form-title"
    >
      <h2 id="removal-form-title" className="font-display text-xl font-semibold">
        Send a removal request
      </h2>
      {!enabled ? (
        <Notice tone="info">The removal form isn&apos;t open yet. Please use the contact page instead.</Notice>
      ) : null}
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}

      <fieldset disabled={!enabled || pending} className="space-y-6">
        {clipId ? <input type="hidden" name="clipId" value={clipId} /> : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="removal-name">Your name</Label>
            <Input
              id="removal-name"
              name="name"
              autoComplete="name"
              maxLength={REMOVAL_LIMITS.name}
              required
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describe("name")}
              className="h-11"
            />
            <FieldError id="name-error" message={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="removal-email">Email address</Label>
            <Input
              id="removal-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={REMOVAL_LIMITS.email}
              required
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describe("email") ?? "removal-email-hint"}
              className="h-11"
            />
            <p id="removal-email-hint" className="text-xs text-muted-foreground">
              Only the moderators see it, to reply to you.
            </p>
            <FieldError id="email-error" message={errors.email} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="removal-url">Page on this site</Label>
          {clipTitle ? (
            <p className="text-sm text-muted-foreground">
              Clip: <span className="font-medium text-foreground">{clipTitle}</span>
            </p>
          ) : null}
          <Input
            id="removal-url"
            name="url"
            type="url"
            inputMode="url"
            maxLength={REMOVAL_LIMITS.url}
            defaultValue={defaultUrl}
            placeholder="https://…"
            required
            aria-invalid={errors.url ? true : undefined}
            aria-describedby={describe("url")}
            className="h-11"
          />
          <FieldError id="url-error" message={errors.url} />
        </div>

        <fieldset className="space-y-3" aria-describedby={describe("role")}>
          <legend className="text-sm font-medium">How is it yours?</legend>
          <RadioGroup
            name="role"
            value={role}
            onValueChange={(value) => setRole(value as RemovalRole)}
            aria-invalid={errors.role ? true : undefined}
            className="gap-2"
          >
            {REMOVAL_ROLES.map((value) => (
              <div key={value} className="flex items-center gap-3">
                <RadioGroupItem id={`removal-role-${value}`} value={value} />
                <Label htmlFor={`removal-role-${value}`} className="font-normal">
                  {REMOVAL_ROLE_LABELS[value]}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <FieldError id="role-error" message={errors.role} />
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="removal-description">What is it, and why should it come down?</Label>
          <Textarea
            id="removal-description"
            name="description"
            rows={5}
            maxLength={REMOVAL_LIMITS.description}
            required
            placeholder="For example: this is a clip from my Twitch channel (twitch.tv/…) and I'd rather it wasn't featured."
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describe("description")}
          />
          <FieldError id="description-error" message={errors.description} />
        </div>

        <div className="flex items-start gap-3 rounded-lg border bg-surface-2/60 p-4">
          <Checkbox
            id="removal-statement"
            name="statement"
            checked={statement}
            onCheckedChange={(value) => setStatement(value === true)}
            aria-invalid={errors.statement && !statement ? true : undefined}
            aria-describedby={errors.statement && !statement ? "statement-error" : undefined}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="removal-statement" className="leading-snug font-normal">
              I confirm the information in this request is accurate, and I believe in good faith that the content is
              used without permission from its owner.
            </Label>
            <FieldError id="statement-error" message={statement ? undefined : errors.statement} />
          </div>
        </div>

        {/* The box is reserved from the start: mounting the widget on first focus must not move the
            submit button, or a first click on it would land on the widget instead. */}
        {enabled && publicEnv.turnstileSiteKey ? (
          <div className="min-h-[65px]">{engaged ? <TurnstileField action="removal" /> : null}</div>
        ) : null}

        <Button type="submit" size="lg">
          <Send aria-hidden="true" />
          {pending ? "Sending…" : "Send removal request"}
        </Button>
      </fieldset>
    </form>
  );
}
