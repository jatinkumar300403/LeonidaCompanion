"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOutAndReload } from "@/lib/supabase/sign-out";
import { deleteAccount, type SettingsState } from "@/server/profiles/actions";

/** SPEC §9 delete account: type the username to confirm; optionally replace post bodies. */
export function DeleteAccount({ username }: { username: string }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(deleteAccount, { status: "idle" });
  const [confirm, setConfirm] = useState("");
  const [removePosts, setRemovePosts] = useState(false);
  const matches = confirm.trim().replace(/^@/, "").toLowerCase() === username;
  const fieldError = state.status === "error" ? state.fieldErrors?.confirmUsername : undefined;
  const deleted = state.status === "deleted";

  useEffect(() => {
    if (deleted) void signOutAndReload("/", "account-deleted");
  }, [deleted]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Trash2 aria-hidden="true" />
          Delete my account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} onSubmit={submitWithoutReset(formAction)} className="space-y-5">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your profile, photo, votes, blocks and notifications for good. Your threads and replies stay,
              shown as &ldquo;[deleted user]&rdquo;. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-3">
            <Checkbox
              id="removePosts"
              name="removePosts"
              checked={removePosts}
              onCheckedChange={(value) => setRemovePosts(value === true)}
              className="mt-0.5"
            />
            <Label htmlFor="removePosts" className="leading-snug font-normal">
              Also replace the text of my threads and replies with &ldquo;[deleted]&rdquo;
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmUsername">
              Type <span className="font-mono">{username}</span> to confirm
            </Label>
            <Input
              id="confirmUsername"
              name="confirmUsername"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "confirmUsername-error" : undefined}
              className="h-11"
            />
            <FieldError id="confirmUsername-error" message={fieldError} />
          </div>

          {state.status === "error" && !fieldError ? <Notice tone="error" title={state.message} /> : null}

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              Keep my account
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={!matches || pending || deleted}>
              {pending || deleted ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {pending || deleted ? "Deleting…" : "Delete forever"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
