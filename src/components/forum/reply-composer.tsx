"use client";

import { Link2Off, Lock, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { QUOTE_EVENT, type QuoteDetail } from "@/components/forum/post-actions";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Button } from "@/components/ui/button";
import { signInPath } from "@/lib/auth/redirect";
import { buildQuote } from "@/lib/forum/quote";
import { containsLink, LINKS_MIN_REPUTATION } from "@/lib/forum/rules";
import { createPost, type ReplyState } from "@/server/forum/actions";

/**
 * The reply box under a thread (SPEC §5). Turnstile mounts on first focus (D-063) and again after
 * each reply, because a token works once. "Quote" on any post fills it in and remembers which
 * post is being answered, so its author gets a "replied to your post" notification.
 */
export function ReplyComposer({
  threadId,
  mode,
  returnTo,
  canLink,
  lockedReason,
}: {
  threadId: number;
  mode: "reply" | "signed-out" | "locked" | "onboarding" | "banned";
  returnTo: string;
  canLink: boolean;
  lockedReason?: string;
}) {
  if (mode === "signed-out") {
    return (
      <div className="rounded-[14px] border border-dashed p-5 text-center">
        <p className="font-medium">Know the answer?</p>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to reply, vote and get notified about answers.</p>
        <Button asChild className="mt-4">
          <Link href={signInPath(returnTo)}>Sign in to reply</Link>
        </Button>
      </div>
    );
  }
  if (mode === "locked") {
    return (
      <Notice tone="info" title="Replies are closed">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden="true" />
          {lockedReason ?? "This thread is locked."}
        </span>
      </Notice>
    );
  }
  if (mode === "onboarding") {
    return (
      <Notice tone="info" title="Finish setting up your account">
        <Link href="/onboarding" className="underline">
          Pick a username
        </Link>{" "}
        to reply.
      </Notice>
    );
  }
  if (mode === "banned") {
    return (
      <Notice tone="error" title="Your account is suspended">
        You can&apos;t reply right now.
      </Notice>
    );
  }
  return <ReplyForm threadId={threadId} canLink={canLink} />;
}

function ReplyForm({ threadId, canLink }: { threadId: number; canLink: boolean }) {
  const id = useId();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<{ postId: number; username: string | null } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const editorId = `${id}-body`;

  // Quote button anywhere on the page → fill the composer and focus it.
  useEffect(() => {
    function onQuote(event: Event) {
      const detail = (event as CustomEvent<QuoteDetail>).detail;
      setBody(
        (current) =>
          `${current.trimEnd() ? `${current.trimEnd()}\n\n` : ""}${buildQuote(detail.username, detail.bodyMd)}`,
      );
      setReplyTo(detail.postId ? { postId: detail.postId, username: detail.username } : null);
      setEngaged(true);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      requestAnimationFrame(() => {
        const field = document.getElementById(editorId) as HTMLTextAreaElement | null;
        field?.focus();
        field?.setSelectionRange(field.value.length, field.value.length);
      });
    }
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, [editorId]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const result: ReplyState = await createPost({ status: "idle" }, formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      if (result.status !== "posted") return;
      // Clear the box, take a fresh bot-check token, and jump to the new reply.
      setError(null);
      setBody("");
      setReplyTo(null);
      setTurnstileKey((key) => key + 1);
      toast.success("Reply posted.");
      router.refresh();
      window.setTimeout(() => {
        document.getElementById(`post-${result.postId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    });
  }

  const linkWarning = !canLink && containsLink(body);

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onFocusCapture={() => setEngaged(true)}
      className="space-y-3"
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        Your reply
      </h2>
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="replyToPostId" value={replyTo?.postId ?? ""} />
      {replyTo ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Replying to {replyTo.username ? `@${replyTo.username}` : "a reply"}
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>
        </p>
      ) : null}
      <MarkdownEditor
        id={editorId}
        value={body}
        onChange={setBody}
        youtube={false}
        mentions
        compact
        label="Your reply"
        placeholder="Be specific and kind. Use ||text|| to hide spoilers."
        invalid={Boolean(error)}
        describedBy={error ? `${id}-error` : undefined}
      />
      {linkWarning ? (
        <p className="flex items-start gap-1.5 text-sm text-orange-text">
          <Link2Off className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Links unlock at {LINKS_MIN_REPUTATION} reputation. Describe the source instead, or remove the link.
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
      {engaged ? <TurnstileField key={turnstileKey} action="forum-reply" /> : null}
      <Button type="submit" disabled={pending || body.trim().length < 2}>
        {pending ? "Posting…" : "Post reply"}
      </Button>
    </form>
  );
}
