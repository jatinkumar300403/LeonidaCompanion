"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { BAN_DURATIONS, type BanDuration } from "@/lib/validation/moderation";
import { banUser } from "@/server/moderation/actions";

/**
 * SPEC §10 ban dialog: temporary (1, 7 or 30 days) or permanent, with a required reason that the
 * member is told. Banned members can still read but can't post, vote, report or edit.
 */
export function BanDialog({
  userId,
  username,
  open,
  onOpenChange,
  onBanned,
}: {
  userId: string;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBanned?: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [duration, setDuration] = useState<BanDuration>("7d");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim().length < 3) {
              setError("Say why (the member sees it).");
              return;
            }
            start(async () => {
              const result = await banUser({ userId, duration, reason });
              if (!result.ok) {
                setError(result.message);
                return;
              }
              toast.success(`@${username}: ${result.message}`);
              setReason("");
              onOpenChange(false);
              onBanned?.();
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Ban @{username}</DialogTitle>
            <DialogDescription>
              They can still read the site but can&apos;t post, vote or edit. They get a notification with your reason.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">How long?</legend>
            <RadioGroup
              value={duration}
              onValueChange={(value) => setDuration(value as BanDuration)}
              className="mt-2 grid grid-cols-2 gap-2"
            >
              {BAN_DURATIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                  <Label htmlFor={`${id}-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="mt-4 space-y-2">
            <Label htmlFor={`${id}-reason`}>Reason (the member sees it)</Label>
            <Textarea
              id={`${id}-reason`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              aria-invalid={Boolean(error) || undefined}
            />
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="mt-5">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              <Ban aria-hidden="true" />
              {pending ? "Banning…" : "Ban"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A "Ban author" button that opens the dialog. */
export function BanButton({
  userId,
  username,
  size = "lg",
  label = "Ban author",
  variant = "ghost",
}: {
  userId: string;
  username: string;
  size?: "default" | "lg" | "sm";
  label?: string;
  /** Ghost in the queues; solid on the user page, where it is the main action. */
  variant?: "ghost" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={variant === "ghost" ? "text-destructive" : undefined}
      >
        <Ban aria-hidden="true" />
        {label}
      </Button>
      <BanDialog userId={userId} username={username} open={open} onOpenChange={setOpen} />
    </>
  );
}
