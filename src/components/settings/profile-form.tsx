"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { PlatformPicker } from "@/components/auth/platform-picker";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BIO_MAX, DISPLAY_NAME_MAX } from "@/config/auth";
import { updateProfile, type SettingsState } from "@/server/profiles/actions";
import { useSavedToast } from "./use-saved-toast";

export function ProfileForm({
  displayName: initialDisplayName,
  bio: initialBio,
  platform: initialPlatform,
}: {
  displayName: string | null;
  bio: string | null;
  platform: string | null;
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateProfile, { status: "idle" });
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [platform, setPlatform] = useState(initialPlatform ?? "");
  useSavedToast(state);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} onSubmit={submitWithoutReset(formAction)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="settings-displayName">Display name</Label>
        <Input
          id="settings-displayName"
          name="displayName"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={errors.displayName ? "settings-displayName-error" : undefined}
          className="h-11"
        />
        <FieldError id="settings-displayName-error" message={errors.displayName} />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="settings-bio">Bio</Label>
          <span className="font-mono text-xs text-muted-foreground tabular-nums" aria-hidden="true">
            {bio.length}/{BIO_MAX}
          </span>
        </div>
        <Textarea
          id="settings-bio"
          name="bio"
          rows={3}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={errors.bio ? "settings-bio-error" : "settings-bio-hint"}
        />
        {errors.bio ? (
          <FieldError id="settings-bio-error" message={errors.bio} />
        ) : (
          <p id="settings-bio-hint" className="text-sm text-muted-foreground">
            Shown on your public profile. Up to {BIO_MAX} characters.
          </p>
        )}
      </div>

      <PlatformPicker value={platform} onChange={setPlatform} idPrefix="settings-platform" />

      {state.status === "error" ? <Notice tone="error" title={state.message} /> : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
