import Link from "next/link";
import type { Route } from "next";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { labelName } from "@/lib/moderation/labels";
import { cn } from "@/lib/utils";

/** Small pieces shared by the moderation queues (server- and client-safe). */

export function LabelBadges({ labels, className }: { labels: readonly string[]; className?: string }) {
  if (labels.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Labels">
      {labels.map((label) => (
        <li key={label}>
          <Badge
            size="sm"
            variant={label === "self_harm" ? "destructive" : label === "new_account" ? "violet" : "orange"}
          >
            {labelName(label)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** The AI's reason, marked as coming from the AI. */
export function AiReason({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
      <Bot className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">AI note: </span>
        {reason}
      </span>
    </p>
  );
}

/**
 * Content shown as plain text, never rendered as markdown, so hidden links or formatting can't
 * mislead the reviewer. Spoiler content sits behind a disclosure (CLAUDE.md rule 5).
 */
export function PlainBody({ text, spoiler }: { text: string | null; spoiler?: boolean }) {
  if (!text?.trim()) return <p className="text-sm text-muted-foreground italic">No text.</p>;
  const body = (
    <p className="max-h-60 overflow-y-auto rounded-lg border bg-surface-2 p-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
      {text}
    </p>
  );
  if (!spoiler) return body;
  return (
    <details className="group rounded-lg border">
      <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        Spoiler content: show
      </summary>
      <div className="p-2 pt-0">{body}</div>
    </details>
  );
}

export function PersonLink({ person }: { person: { id: string; username: string } | null }) {
  if (!person) return <span>[deleted user]</span>;
  return (
    <Link href={`/admin/users/${person.id}` as Route} className="font-medium text-foreground hover:underline">
      @{person.username}
    </Link>
  );
}
