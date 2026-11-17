"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { confirmNewsletter, type ConfirmState } from "@/server/newsletter/actions";

const LIST_LABELS: Record<string, string> = {
  digest: "the weekly digest",
  online_waitlist: "the Online waitlist",
};

/** One button: confirming takes a deliberate click, so email link scanners can't confirm for you. */
export function ConfirmForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ConfirmState, FormData>(confirmNewsletter, { status: "idle" });

  if (state.status === "confirmed") {
    const lists = state.lists.map((list) => LIST_LABELS[list] ?? list).join(" and ");
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <p className="flex items-start gap-2 text-base text-teal-text">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {lists ? `You're in: ${lists}.` : "You're confirmed."}
        </p>
        <Button asChild variant="secondary">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Confirming…" : "Confirm my email"}
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
