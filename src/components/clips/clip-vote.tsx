"use client";

import { ArrowBigUp } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { signInPath } from "@/lib/auth/redirect";
import { formatCount } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { voteClip } from "@/server/clips/actions";

/**
 * Clip votes (SPEC §6). Clip pages and the feed are cached for everyone, so the viewer's own votes
 * are read here in the browser, under RLS, in one query for every clip on the page (D-073).
 */
type Vote = -1 | 0 | 1;
type Viewer = { userId: string | null; votes: Map<number, Vote> } | null;

const ViewerContext = createContext<Viewer>(null);

export function ClipVoteScope({ clipIds, children }: { clipIds: readonly number[]; children: React.ReactNode }) {
  const [viewer, setViewer] = useState<Viewer>(null);
  const key = clipIds.join(",");

  useEffect(() => {
    let active = true;
    const supabase = getBrowserSupabase();
    const ids = key ? key.split(",").map(Number) : [];
    (async () => {
      if (!supabase) return setViewer({ userId: null, votes: new Map() });
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? null;
      if (!userId || ids.length === 0) {
        if (active) setViewer({ userId, votes: new Map() });
        return;
      }
      const { data: rows } = await supabase
        .from("votes")
        .select("target_id, value")
        .eq("user_id", userId)
        .eq("target_type", "clip")
        .in("target_id", ids);
      if (active) {
        setViewer({ userId, votes: new Map((rows ?? []).map((row) => [row.target_id, row.value as Vote])) });
      }
    })();
    return () => {
      active = false;
    };
  }, [key]);

  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function ClipVote({
  clipId,
  score,
  submittedBy,
  returnTo,
}: {
  clipId: number;
  score: number;
  submittedBy?: string | null;
  returnTo: string;
}) {
  const viewer = useContext(ViewerContext);

  const staticScore = (title?: string) => (
    <span className="inline-flex items-center gap-1 font-mono text-sm text-muted-foreground tabular-nums" title={title}>
      <ArrowBigUp className="size-4" aria-hidden="true" />
      {formatCount(score)}
      <span className="sr-only"> votes</span>
    </span>
  );

  // Still reading the session: show the score without buttons, so nothing jumps.
  if (!viewer) return staticScore();
  if (!viewer.userId) {
    return (
      <Link
        href={signInPath(returnTo)}
        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-mono text-sm text-muted-foreground tabular-nums hover:bg-accent hover:text-foreground"
        aria-label={`${score} votes. Sign in to vote`}
      >
        <ArrowBigUp className="size-5" aria-hidden="true" />
        {formatCount(score)}
      </Link>
    );
  }
  if (submittedBy && viewer.userId === submittedBy) return staticScore("Your own clip");

  const myVote = viewer.votes.get(clipId) ?? 0;
  return (
    <VoteButtons
      key={`${score}:${myVote}`}
      initialScore={score}
      initialVote={myVote}
      orientation="horizontal"
      label="clip"
      onVote={async (value) => {
        const result = await voteClip({ clipId, value });
        if (!result.ok) {
          toast.error(result.message);
          throw new Error(result.message);
        }
      }}
    />
  );
}
