"use client";

import { Check, ExternalLink, RotateCcw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClipEmbed } from "@/components/clips/clip-embed";
import { RelativeTime } from "@/components/shared/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLIP_REJECT_REASONS, CLIP_REMOVE_REASONS } from "@/config/clips";
import { CLIP_CATEGORIES, type ClipCategory } from "@/config/tags";
import { PLATFORM_LABELS } from "@/lib/clips/embed";
import { formatCount, formatDuration } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { reviewClip } from "@/server/clips/actions";
import type { ClipQueueItem, ClipStatus } from "@/types/content";

/**
 * The clips queue (SPEC §6, §10): one tap to approve, reject with a reason, or remove an approved
 * clip; works one-handed at 390 px. On a keyboard: A approves, R rejects (or removes), J/K move.
 * Reviewed clips leave the list at once.
 */
type Panel = { id: number; kind: "reject" | "remove" } | null;

export function ClipReviewQueue({
  items: initialItems,
  status,
  parentHosts,
  className,
}: {
  items: ClipQueueItem[];
  status: ClipStatus;
  parentHosts: readonly string[];
  className?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [active, setActive] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [categories, setCategories] = useState<Record<number, ClipCategory>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const itemRefs = useRef(new Map<number, HTMLLIElement>());

  const current = items[Math.min(active, items.length - 1)];

  const review = useCallback(
    (item: ClipQueueItem, decision: "approve" | "reject" | "remove", reason?: string) => {
      setPendingId(item.id);
      startTransition(async () => {
        const result = await reviewClip(
          decision === "approve"
            ? { id: item.id, decision, category: categories[item.id] ?? item.category }
            : { id: item.id, decision, reason: reason ?? "" },
        );
        setPendingId(null);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success(decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Removed");
        setPanel(null);
        setItems((list) => list.filter((entry) => entry.id !== item.id));
      });
    },
    [categories],
  );

  const focusItem = useCallback(
    (index: number) => {
      const target = items[index];
      if (!target) return;
      setActive(index);
      const node = itemRefs.current.get(target.id);
      node?.focus({ preventScroll: true });
      node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    [items],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (!current || pendingId !== null) return;
      const key = event.key.toLowerCase();
      if (key === "a" && status !== "approved") {
        event.preventDefault();
        review(current, "approve");
      } else if (key === "r" && (status === "pending" || status === "approved")) {
        event.preventDefault();
        setPanel({ id: current.id, kind: status === "approved" ? "remove" : "reject" });
      } else if (key === "j") {
        event.preventDefault();
        focusItem(Math.min(active + 1, items.length - 1));
      } else if (key === "k") {
        event.preventDefault();
        focusItem(Math.max(active - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, current, focusItem, items.length, pendingId, review, status]);

  if (items.length === 0) {
    return (
      <p className={cn("rounded-xl border border-dashed p-8 text-center text-muted-foreground", className)}>
        All done here. Nice work.
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="hidden text-xs text-muted-foreground lg:block">
        Keyboard: <kbd className="rounded border px-1">A</kbd> approve · <kbd className="rounded border px-1">R</kbd>{" "}
        {status === "approved" ? "remove" : "reject"} · <kbd className="rounded border px-1">J</kbd>/
        <kbd className="rounded border px-1">K</kbd> next/previous
      </p>
      <ul className="mt-3 flex flex-col gap-4">
        {items.map((item, index) => (
          <li
            key={item.id}
            ref={(node) => {
              if (node) itemRefs.current.set(item.id, node);
              else itemRefs.current.delete(item.id);
            }}
            tabIndex={-1}
            onFocusCapture={() => setActive(index)}
            onPointerDown={() => setActive(index)}
            aria-label={item.title}
            className={cn(
              "grid gap-4 rounded-xl border bg-card p-3 outline-none sm:p-4 lg:grid-cols-[minmax(0,22rem)_1fr]",
              index === active && "border-pink/50 ring-1 ring-pink/30",
            )}
          >
            <ClipEmbed clip={item} parentHosts={parentHosts} variant="card" />
            <QueueDetails
              item={item}
              status={status}
              category={categories[item.id] ?? item.category}
              onCategory={(value) => setCategories((map) => ({ ...map, [item.id]: value }))}
              busy={pendingId === item.id}
              panel={panel?.id === item.id ? panel.kind : null}
              onApprove={() => review(item, "approve")}
              onOpenPanel={(kind) => setPanel({ id: item.id, kind })}
              onClosePanel={() => setPanel(null)}
              onConfirm={(kind, reason) => review(item, kind, reason)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function QueueDetails({
  item,
  status,
  category,
  onCategory,
  busy,
  panel,
  onApprove,
  onOpenPanel,
  onClosePanel,
  onConfirm,
}: {
  item: ClipQueueItem;
  status: ClipStatus;
  category: ClipCategory;
  onCategory: (value: ClipCategory) => void;
  busy: boolean;
  panel: "reject" | "remove" | null;
  onApprove: () => void;
  onOpenPanel: (kind: "reject" | "remove") => void;
  onClosePanel: () => void;
  onConfirm: (kind: "reject" | "remove", reason: string) => void;
}) {
  const id = useId();
  const platform = PLATFORM_LABELS[item.platform];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" size="sm">
          {platform}
        </Badge>
        <Badge variant={item.source === "twitch_auto" ? "violet" : "teal"} size="sm">
          {item.source === "twitch_auto" ? "Twitch auto" : "Member"}
        </Badge>
        {item.durationSec !== null ? (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDuration(item.durationSec)}
          </span>
        ) : (
          <Badge variant="orange" size="sm">
            Length unknown: check it
          </Badge>
        )}
        {item.viewsOnPlatform !== null ? (
          <span className="text-xs text-muted-foreground">{formatCount(item.viewsOnPlatform)} views</span>
        ) : null}
      </div>

      <div className="min-w-0">
        <h2 className="font-semibold break-words">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {item.title}
            <ExternalLink className="ml-1 inline size-3.5 align-baseline" aria-hidden="true" />
            <span className="sr-only">(opens on {platform})</span>
          </a>
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {item.creatorName ? <>by {item.creatorName} · </> : null}
          {item.submitterUsername ? (
            <>
              sent by{" "}
              <Link href={routes.user(item.submitterUsername)} className="hover:underline">
                @{item.submitterUsername}
              </Link>{" "}
              ·{" "}
            </>
          ) : null}
          <RelativeTime date={item.createdAt} />
        </p>
        {item.caption ? <p className="mt-2 text-sm break-words">&ldquo;{item.caption}&rdquo;</p> : null}
        {item.rejectReason && status !== "pending" && status !== "approved" ? (
          <p className="mt-2 text-sm text-muted-foreground">Reason: {item.rejectReason}</p>
        ) : null}
      </div>

      {status !== "removed" && status !== "rejected" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-category`} className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            id={`${id}-category`}
            value={category}
            onChange={(event) => onCategory(event.target.value as ClipCategory)}
            disabled={status === "approved"}
            className="h-10 max-w-56 rounded-[10px] border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
          >
            {CLIP_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {panel ? (
        <ReasonPanel
          kind={panel}
          busy={busy}
          onCancel={onClosePanel}
          onConfirm={(reason) => onConfirm(panel, reason)}
        />
      ) : (
        <div className="mt-auto flex flex-wrap gap-2">
          {status === "approved" ? (
            <>
              <Button variant="destructive" size="lg" disabled={busy} onClick={() => onOpenPanel("remove")}>
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href={routes.clip(item.id)}>View on site</Link>
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" disabled={busy} onClick={onApprove} className="min-w-32">
                {status === "pending" ? <Check aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                {status === "pending" ? "Approve" : "Approve anyway"}
              </Button>
              {status === "pending" ? (
                <Button variant="secondary" size="lg" disabled={busy} onClick={() => onOpenPanel("reject")}>
                  <X aria-hidden="true" />
                  Reject
                </Button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReasonPanel({
  kind,
  busy,
  onCancel,
  onConfirm,
}: {
  kind: "reject" | "remove";
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const firstRef = useRef<HTMLButtonElement>(null);
  const presets = kind === "reject" ? CLIP_REJECT_REASONS : CLIP_REMOVE_REASONS;

  useEffect(() => firstRef.current?.focus(), []);

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border bg-surface-2 p-3"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <p id={`${id}-label`} className="text-sm font-semibold">
        {kind === "reject" ? "Why reject it?" : "Why remove it?"}
      </p>
      <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
        {presets.map((preset, index) => (
          <button
            key={preset}
            ref={index === 0 ? firstRef : undefined}
            type="button"
            aria-pressed={reason === preset}
            onClick={() => setReason(preset)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-sm transition-colors",
              reason === preset ? "border-pink/50 bg-pink/12" : "bg-background hover:bg-accent",
            )}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-reason`} className="text-xs font-medium text-muted-foreground">
          Reason (the submitter sees it)
        </label>
        <Input
          id={`${id}-reason`}
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && reason.trim().length >= 2) {
              event.preventDefault();
              onConfirm(reason.trim());
            }
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={kind === "remove" ? "destructive" : "default"}
          disabled={busy || reason.trim().length < 2}
          onClick={() => onConfirm(reason.trim())}
        >
          {kind === "reject" ? "Reject clip" : "Remove clip"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
