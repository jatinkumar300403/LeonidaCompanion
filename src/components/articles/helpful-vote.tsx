"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { voteHelpful } from "@/server/articles/feedback";

type Vote = -1 | 0 | 1;

const storageKey = (id: string) => `la:helpful:${id}`;
const noopSubscribe = () => () => {};

function readVote(id: string): Vote {
  try {
    const value = Number(window.localStorage.getItem(storageKey(id)));
    return value === 1 || value === -1 ? value : 0;
  } catch {
    return 0;
  }
}

function writeVote(id: string, vote: Vote) {
  try {
    if (vote === 0) window.localStorage.removeItem(storageKey(id));
    else window.localStorage.setItem(storageKey(id), String(vote));
  } catch {
    // Storage blocked: the vote still counts, the button just won't remember it.
  }
}

/** "Was this helpful?" 👍/👎 (SPEC §4). Optimistic; pressing the same button again takes the vote back. */
export function HelpfulVote({ articleId, up, down }: { articleId: string; up: number; down: number }) {
  // The remembered vote lives in localStorage, which the server can't see.
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => readVote(articleId),
    () => 0 as Vote,
  );
  const [local, setLocal] = useState<Vote | null>(null);
  const vote = local ?? stored;
  const [counts, setCounts] = useState({ up, down });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: Vote) {
    const value: Vote = vote === next ? 0 : next;
    const previous = { vote, counts };
    setLocal(value);
    setCounts({
      up: counts.up + (value === 1 ? 1 : 0) - (vote === 1 ? 1 : 0),
      down: counts.down + (value === -1 ? 1 : 0) - (vote === -1 ? 1 : 0),
    });
    setMessage(value === 0 ? null : "Thanks for the feedback.");
    startTransition(async () => {
      const result = await voteHelpful(articleId, value);
      if (result.ok) {
        writeVote(articleId, value);
        setCounts({ up: result.up, down: result.down });
      } else {
        setLocal(previous.vote);
        setCounts(previous.counts);
        setMessage(result.message);
      }
    });
  }

  return (
    <section aria-labelledby="helpful-heading" className="rounded-xl border bg-surface p-5">
      <h2 id="helpful-heading" className="text-base font-semibold">
        Was this helpful?
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          aria-pressed={vote === 1}
          disabled={pending}
          onClick={() => choose(1)}
          className={cn(vote === 1 && "border-teal/40 bg-teal/12 text-teal-text")}
        >
          <ThumbsUp aria-hidden="true" />
          Yes
          <span className="font-mono text-xs tabular-nums">{formatCount(counts.up)}</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={vote === -1}
          disabled={pending}
          onClick={() => choose(-1)}
          className={cn(vote === -1 && "border-pink/40 bg-pink/12 text-pink-text")}
        >
          <ThumbsDown aria-hidden="true" />
          No
          <span className="font-mono text-xs tabular-nums">{formatCount(counts.down)}</span>
        </Button>
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      </div>
    </section>
  );
}
