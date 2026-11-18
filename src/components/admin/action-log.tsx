import Link from "next/link";
import { Bot, ShieldCheck } from "lucide-react";
import { LabelBadges, PersonLink } from "@/components/admin/queue-bits";
import { RelativeTime } from "@/components/shared/relative-time";
import { actionText } from "@/lib/moderation/action-text";
import { cn } from "@/lib/utils";
import type { ActionRow } from "@/server/moderation/queries";

/** SPEC §10 Recent actions: the audit log, newest first. Human and AI rows look different. */
export function ActionLog({ rows, className }: { rows: ActionRow[]; className?: string }) {
  if (rows.length === 0) {
    return (
      <p className={cn("rounded-xl border border-dashed p-8 text-center text-muted-foreground", className)}>
        Nothing logged yet.
      </p>
    );
  }
  return (
    <ol className={cn("flex flex-col divide-y rounded-xl border bg-card", className)}>
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-1.5 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {row.actorType === "ai" ? (
              <span className="inline-flex items-center gap-1 font-medium text-violet-text">
                <Bot className="size-4" aria-hidden="true" />
                AI check
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="size-4 text-teal-text" aria-hidden="true" />
                <PersonLink person={row.actor} />
              </span>
            )}
            <span className="font-medium">
              {row.href ? (
                <Link href={row.href} className="hover:underline">
                  {actionText(row.action, row.targetType)}
                </Link>
              ) : (
                actionText(row.action, row.targetType)
              )}
            </span>
            {row.subject ? (
              <span className="text-muted-foreground">
                by <PersonLink person={row.subject} />
              </span>
            ) : null}
            <span className="text-muted-foreground">
              · <RelativeTime date={row.at} />
            </span>
          </div>
          <LabelBadges labels={row.labels} />
          {row.reason ? <p className="text-sm break-words text-muted-foreground">{row.reason}</p> : null}
          {row.excerpt ? (
            <p className="line-clamp-2 text-sm break-words text-muted-foreground italic">“{row.excerpt}”</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
