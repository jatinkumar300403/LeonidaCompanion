"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPrefs, type SettingsState } from "@/server/profiles/actions";
import { useSavedToast } from "./use-saved-toast";

/** SPEC §9: in-app notifications are always on; email for replies and mentions is opt-in. */
export function NotificationsForm({ notifyEmailReplies }: { notifyEmailReplies: boolean }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateNotificationPrefs, {
    status: "idle",
  });
  const [checked, setChecked] = useState(notifyEmailReplies);
  useSavedToast(state);

  return (
    <form action={formAction} onSubmit={submitWithoutReset(formAction)} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="notifyEmailReplies">Email me about replies and mentions</Label>
          <p id="notifyEmailReplies-hint" className="text-sm text-muted-foreground">
            At most one email an hour. You always see notifications on the site.
          </p>
        </div>
        <Switch
          id="notifyEmailReplies"
          name="notifyEmailReplies"
          value="true"
          checked={checked}
          onCheckedChange={setChecked}
          aria-describedby="notifyEmailReplies-hint"
          className="mt-0.5"
        />
      </div>
      {state.status === "error" ? <Notice tone="error" title={state.message} /> : null}
      <Button type="submit" variant="secondary" disabled={pending || checked === notifyEmailReplies}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Save notification settings
      </Button>
    </form>
  );
}
