"use client";

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
import { REPORT_REASONS, type ReportTarget } from "@/config/forum";
import { reportContent } from "@/server/forum/actions";

/**
 * SPEC §5 report dialog: a reason from the fixed list plus optional details. Reports go to the
 * moderation queue (Phase 6). Controlled, so a menu item or a button can open it.
 */
export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  what,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTarget;
  targetId: string;
  /** "this reply", "this thread", "@sam". */
  what: string;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
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
            if (!reason) {
              setError("Pick a reason.");
              return;
            }
            start(async () => {
              const result = await reportContent({ targetType, targetId, reason, details });
              if (!result.ok) {
                setError(result.message);
                return;
              }
              toast.success(result.message);
              setReason("");
              setDetails("");
              onOpenChange(false);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Report {what}</DialogTitle>
            <DialogDescription>
              Moderators review every report. The person isn&apos;t told who reported them.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="mt-4">
            <legend className="sr-only">Reason</legend>
            <RadioGroup value={reason} onValueChange={setReason} className="grid gap-2 sm:grid-cols-2">
              {REPORT_REASONS.map((option) => (
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
            <Label htmlFor={`${id}-details`}>Details (optional)</Label>
            <Textarea
              id={`${id}-details`}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={2000}
              rows={3}
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
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
