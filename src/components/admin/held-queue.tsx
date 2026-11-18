"use client";

import { Check, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BanButton } from "@/components/admin/ban-dialog";
import { AiReason, LabelBadges, PersonLink, PlainBody } from "@/components/admin/queue-bits";
import { RelativeTime } from "@/components/shared/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { decideContent } from "@/server/moderation/actions";
import type { HeldItem } from "@/server/moderation/queries";

/**
 * SPEC §10 Held tab: threads and replies the AI pre-check held (SPEC §8.2), oldest first, with the
 * labels and reason. One tap approves or removes; an item leaves the list once decided.
 */
export function HeldQueue({ items: initial, className }: { items: HeldItem[]; className?: string }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  function decide(item: HeldItem, decision: "approve" | "remove") {
    setBusy(item.key);
    start(async () => {
      const result = await decideContent({ targetType: item.kind, id: item.id, decision });
      setBusy(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(decision === "approve" ? "Approved: it's public now." : "Removed.");
      setItems((list) => list.filter((entry) => entry.key !== item.key));
    });
  }

  if (items.length === 0) {
    return (
      <p className={cn("rounded-xl border border-dashed p-8 text-center text-muted-foreground", className)}>
        Nothing held. All clear.
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {items.map((item) => (
        <li key={item.key}>
          <article
            aria-label={`Held ${item.kind === "thread" ? "thread" : "reply"} by ${item.author ? `@${item.author.username}` : "a deleted user"}`}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={item.kind === "thread" ? "teal" : "secondary"} size="sm">
                {item.kind === "thread" ? "Thread" : "Reply"}
              </Badge>
              {item.categoryName ? <span>{item.categoryName}</span> : null}
              <span aria-hidden="true">·</span>
              <PersonLink person={item.author} />
              <span aria-hidden="true">·</span>
              <RelativeTime date={item.createdAt} />
            </div>

            <h2 className="font-semibold break-words">
              {item.kind === "thread" ? item.threadTitle : <>Reply in “{item.threadTitle}”</>}
            </h2>

            {item.ai ? (
              <div className="flex flex-col gap-1.5">
                <LabelBadges labels={item.ai.labels} />
                <AiReason reason={item.ai.reason} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No AI note (held by a moderator or before logging).</p>
            )}

            <PlainBody text={item.body} spoiler={item.isSpoiler} />

            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                className="min-w-32"
                disabled={busy === item.key}
                onClick={() => decide(item, "approve")}
              >
                <Check aria-hidden="true" />
                Approve
              </Button>
              <Button
                size="lg"
                variant="destructive"
                disabled={busy === item.key}
                onClick={() => decide(item, "remove")}
              >
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
              {item.author ? <BanButton userId={item.author.id} username={item.author.username} /> : null}
              <Button asChild size="lg" variant="ghost">
                <Link href={item.href}>
                  <ExternalLink aria-hidden="true" />
                  Open
                </Link>
              </Button>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
