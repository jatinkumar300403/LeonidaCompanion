"use client";

import { CheckCheck, ExternalLink, Lock, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { BanButton } from "@/components/admin/ban-dialog";
import { PersonLink, PlainBody } from "@/components/admin/queue-bits";
import { RelativeTime } from "@/components/shared/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { decideContent, moveThread, resolveReports } from "@/server/moderation/actions";
import type { ReportGroup } from "@/server/moderation/queries";

/**
 * SPEC §10 Reports tab: open reports grouped by what they point at. Remove takes the item down and
 * closes its reports; Dismiss closes them without action. Threads can also be locked or moved, and
 * the author banned. A card leaves the list once its reports are closed.
 */
const TYPE_LABELS: Record<string, string> = {
  thread: "Thread",
  post: "Reply",
  clip: "Clip",
  profile: "Profile",
  article: "Article",
  dmca: "Removal request",
};

export function ReportQueue({
  groups: initial,
  categories,
  reasonLabels,
  className,
}: {
  groups: ReportGroup[];
  categories: { id: number; name: string }[];
  reasonLabels: Record<string, string>;
  className?: string;
}) {
  const [groups, setGroups] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  function run(group: ReportGroup, task: () => Promise<{ ok: boolean; message: string }>, closes: boolean) {
    setBusy(group.key);
    start(async () => {
      const result = await task();
      setBusy(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (closes) setGroups((list) => list.filter((entry) => entry.key !== group.key));
    });
  }

  if (groups.length === 0) {
    return (
      <p className={cn("rounded-xl border border-dashed p-8 text-center text-muted-foreground", className)}>
        No open reports.
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {groups.map((group) => {
        const target = group.target;
        const removable = ["thread", "post", "clip"].includes(group.targetType) && target?.status !== "removed";
        const isBusy = busy === group.key;
        const resolve = (outcome: "actioned" | "dismissed", remove = false) =>
          run(
            group,
            () => resolveReports({ targetType: group.targetType, targetId: group.targetId, outcome, remove }),
            true,
          );
        return (
          <li key={group.key}>
            <article
              aria-label={`${group.count} ${group.count === 1 ? "report" : "reports"} on ${TYPE_LABELS[group.targetType]?.toLowerCase() ?? "item"}: ${target?.title ?? group.targetId}`}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" size="sm">
                  {TYPE_LABELS[group.targetType] ?? group.targetType}
                </Badge>
                <Badge variant="pink" size="sm">
                  {group.count} {group.count === 1 ? "report" : "reports"}
                </Badge>
                {target?.status && target.status !== "open" && target.status !== "visible" ? (
                  <Badge variant="tag" size="sm">
                    Now {target.status}
                  </Badge>
                ) : null}
                <span>
                  first <RelativeTime date={group.firstAt} />
                </span>
              </div>

              <ul className="flex flex-wrap gap-1.5" aria-label="Reasons">
                {group.reasons.map((reason) => (
                  <li key={reason}>
                    <Badge variant="orange" size="sm">
                      {reasonLabels[reason] ?? reason}
                    </Badge>
                  </li>
                ))}
              </ul>
              {group.details.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {group.details.map((detail, index) => (
                    <li key={index} className="break-words">
                      “{detail}”
                    </li>
                  ))}
                </ul>
              ) : null}

              {target ? (
                <div className="flex flex-col gap-2">
                  <h2 className="font-semibold break-words">{target.title}</h2>
                  {group.targetType !== "profile" && group.targetType !== "dmca" ? (
                    <p className="text-sm text-muted-foreground">
                      by <PersonLink person={target.author} />
                    </p>
                  ) : null}
                  <PlainBody text={target.body} spoiler={target.isSpoiler} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The reported item is gone or can&apos;t be shown here ({group.targetType} {group.targetId}).
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {removable && target ? (
                  <Button size="lg" variant="destructive" disabled={isBusy} onClick={() => resolve("actioned", true)}>
                    <Trash2 aria-hidden="true" />
                    Remove
                  </Button>
                ) : (
                  <Button size="lg" disabled={isBusy} onClick={() => resolve("actioned")}>
                    <CheckCheck aria-hidden="true" />
                    Mark handled
                  </Button>
                )}
                <Button size="lg" variant="secondary" disabled={isBusy} onClick={() => resolve("dismissed")}>
                  <X aria-hidden="true" />
                  Dismiss
                </Button>
                {group.targetType === "thread" &&
                target &&
                target.status !== "locked" &&
                target.status !== "removed" ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={isBusy}
                    onClick={() =>
                      run(
                        group,
                        () => decideContent({ targetType: "thread", id: Number(group.targetId), decision: "lock" }),
                        false,
                      )
                    }
                  >
                    <Lock aria-hidden="true" />
                    Lock
                  </Button>
                ) : null}
                {target?.author ? (
                  <BanButton
                    userId={target.author.id}
                    username={target.author.username}
                    label={group.targetType === "profile" ? "Ban user" : "Ban author"}
                  />
                ) : null}
                {target?.href ? (
                  <Button asChild size="lg" variant="ghost">
                    <Link href={target.href}>
                      <ExternalLink aria-hidden="true" />
                      Open
                    </Link>
                  </Button>
                ) : null}
              </div>

              {group.targetType === "thread" && target && target.categoryId !== null ? (
                <MoveThread
                  disabled={isBusy}
                  categories={categories}
                  current={target.categoryId}
                  onMove={(categoryId) =>
                    run(group, () => moveThread({ id: Number(group.targetId), categoryId }), false)
                  }
                />
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function MoveThread({
  categories,
  current,
  disabled,
  onMove,
}: {
  categories: { id: number; name: string }[];
  current: number;
  disabled: boolean;
  onMove: (categoryId: number) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(String(current));
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          Move to
        </label>
        <select
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-10 max-w-64 rounded-[10px] border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="secondary"
        disabled={disabled || Number(value) === current}
        onClick={() => onMove(Number(value))}
      >
        Move
      </Button>
    </div>
  );
}
