"use client";

import { CircleCheck, Clock, ExternalLink, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { ClipEmbed } from "@/components/clips/clip-embed";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLIP_CAPTION_MAX } from "@/config/clips";
import { CLIP_CATEGORIES, type ClipCategory } from "@/config/tags";
import { PLATFORM_LABELS } from "@/lib/clips/embed";
import { parseClipUrl } from "@/lib/clips/parse";
import { formatDuration } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { previewClip, submitClip, type ClipPreview, type SubmitClipState } from "@/server/clips/actions";

/**
 * /clips/submit (SPEC §6): paste a link → live preview from the platform → category, caption and
 * "not a story spoiler" → submit (Turnstile) → pending for a moderator. The server resolves the
 * link again on submit, so the preview is only a convenience.
 */
export function ClipSubmitForm({ parentHosts }: { parentHosts: readonly string[] }) {
  const id = useId();
  const [state, formAction, submitting] = useActionState<SubmitClipState, FormData>(submitClip, { status: "idle" });
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<ClipCategory | null>(null);
  const [caption, setCaption] = useState("");
  const [notSpoiler, setNotSpoiler] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [dismissedClipId, setDismissedClipId] = useState<number | null>(null);
  const preview = useClipPreview(url);
  const urlRef = useRef<HTMLInputElement>(null);

  if (state.status === "done" && state.clipId !== dismissedClipId) {
    const clipId = state.clipId;
    return (
      <SubmittedPanel
        title={state.title}
        onAnother={() => {
          setUrl("");
          setCategory(null);
          setCaption("");
          setNotSpoiler(false);
          setDismissedClipId(clipId);
          requestAnimationFrame(() => urlRef.current?.focus());
        }}
      />
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError = state.status === "error" && !state.fieldErrors?.url ? state.message : null;
  const urlError = errors.url ?? (preview.status === "error" ? preview.message : null);
  const blocked = preview.status === "ready" && preview.preview.existing !== null;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        submitWithoutReset(formAction)(event);
        // A Turnstile token works once: the token is in this submission, so mount a fresh widget.
        setTurnstileKey((key) => key + 1);
      }}
      onFocusCapture={() => setEngaged(true)}
      className="flex flex-col gap-8"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-url`}>Clip link</Label>
        <div className="relative">
          <Link2
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={urlRef}
            id={`${id}-url`}
            name="url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/shorts/…"
            className="pl-9"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={urlError ? true : undefined}
            aria-describedby={`${id}-url-hint${urlError ? ` ${id}-url-error` : ""}`}
          />
        </div>
        <p id={`${id}-url-hint`} className="text-xs text-muted-foreground">
          A Twitch clip, YouTube Short or video, or TikTok link. Up to 60 seconds, GTA VI only.
        </p>
        <FieldError id={`${id}-url-error`} message={urlError} />
      </div>

      <div aria-live="polite">
        {preview.status === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Checking the link…
          </p>
        ) : preview.status === "ready" ? (
          <PreviewCard preview={preview.preview} parentHosts={parentHosts} />
        ) : null}
      </div>

      <fieldset aria-describedby={errors.category ? `${id}-category-error` : undefined}>
        <legend className="text-sm font-semibold">Category</legend>
        <input type="hidden" name="category" value={category ?? ""} />
        <div role="radiogroup" aria-label="Category" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CLIP_CATEGORIES.map((option) => {
            const selected = option.value === category;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(option.value)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-sm font-medium transition-colors",
                  selected ? "border-pink/50 bg-pink/8" : "bg-surface hover:bg-accent/50",
                )}
              >
                {selected ? <CircleCheck className="size-4 shrink-0 text-pink-text" aria-hidden="true" /> : null}
                {option.label}
              </button>
            );
          })}
        </div>
        <FieldError id={`${id}-category-error`} message={errors.category} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${id}-caption`}>
          Caption <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${id}-caption`}
          name="caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value.slice(0, CLIP_CAPTION_MAX))}
          rows={2}
          placeholder="What happens? Use ||text|| to hide a spoiler."
          aria-invalid={errors.caption ? true : undefined}
          aria-describedby={`${id}-caption-hint${errors.caption ? ` ${id}-caption-error` : ""}`}
        />
        <p id={`${id}-caption-hint`} className="text-xs text-muted-foreground tabular-nums">
          {caption.length}/{CLIP_CAPTION_MAX}
        </p>
        <FieldError id={`${id}-caption-error`} message={errors.caption} />
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${id}-spoiler`}
            name="notSpoiler"
            checked={notSpoiler}
            onCheckedChange={(checked) => setNotSpoiler(checked === true)}
            className="mt-0.5"
            aria-invalid={errors.notSpoiler ? true : undefined}
            aria-describedby={`${id}-spoiler-hint${errors.notSpoiler ? ` ${id}-spoiler-error` : ""}`}
          />
          <div>
            <Label htmlFor={`${id}-spoiler`}>This isn&apos;t a story spoiler or cutscene</Label>
            <p id={`${id}-spoiler-hint`} className="mt-1 text-xs text-muted-foreground">
              No missions&apos; endings, story cutscenes, cheats, exploits or leaks. Moderators reject those.
            </p>
          </div>
        </div>
        <FieldError id={`${id}-spoiler-error`} message={errors.notSpoiler} />
      </div>

      {engaged ? <TurnstileField key={turnstileKey} action="clip-submit" /> : null}

      {formError ? (
        <Notice tone="error" title="Not sent">
          {formError}
          {state.status === "error" && state.existingId ? (
            <>
              {" "}
              <Link href={routes.clip(state.existingId)} className="underline">
                See it here
              </Link>
              .
            </>
          ) : null}
        </Notice>
      ) : null}

      <div>
        <Button type="submit" size="lg" disabled={submitting || blocked}>
          {submitting ? "Sending…" : "Send for review"}
        </Button>
      </div>
    </form>
  );
}

function PreviewCard({ preview, parentHosts }: { preview: ClipPreview; parentHosts: readonly string[] }) {
  const platform = PLATFORM_LABELS[preview.platform];
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <ClipEmbed
        variant="card"
        parentHosts={parentHosts}
        className="rounded-none border-0 border-b"
        clip={{
          id: 0,
          platform: preview.platform,
          embedId: preview.embedId,
          url: preview.url,
          title: preview.title,
          creatorName: preview.creatorName,
          creatorUrl: preview.creatorUrl,
          durationSec: preview.durationSec,
          thumbnailUrl: preview.thumbnailUrl,
          category: "other",
          score: 0,
          orientation: preview.orientation,
        }}
      />
      <div className="space-y-1.5 p-4">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Preview</p>
        <p className="font-semibold break-words">{preview.title}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {preview.creatorName ? <span>by {preview.creatorName}</span> : null}
          <span>
            {preview.durationSec !== null
              ? formatDuration(preview.durationSec)
              : "Length unknown (a moderator checks it)"}
          </span>
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            Open on {platform}
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
        {preview.existing ? (
          <Notice tone="info" className="mt-2">
            {preview.existing.message}{" "}
            {preview.existing.status === "approved" ? (
              <Link href={routes.clip(preview.existing.id)} className="underline">
                See it here
              </Link>
            ) : null}
          </Notice>
        ) : null}
      </div>
    </div>
  );
}

function SubmittedPanel({ title, onAnother }: { title: string; onAnother: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-teal/40 bg-teal/8 p-6">
      <Clock className="size-6 text-teal-text" aria-hidden="true" />
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          Sent for review
        </h2>
        <p className="mt-1 text-muted-foreground">
          &ldquo;{title}&rdquo; is waiting for a moderator. You&apos;ll get a notification when it&apos;s approved.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onAnother}>
          Submit another
        </Button>
        <Button asChild variant="secondary">
          <Link href="/clips">Browse clips</Link>
        </Button>
      </div>
    </div>
  );
}

type PreviewState =
  | { status: "empty" }
  | { status: "loading"; url: string }
  | { status: "ready"; url: string; preview: ClipPreview }
  | { status: "error"; url: string; message: string };

/** Looks the link up 500 ms after it starts to look like a clip link. */
function useClipPreview(rawUrl: string): PreviewState {
  const [result, setResult] = useState<PreviewState>({ status: "empty" });
  const url = rawUrl.trim();
  const looksValid = url.length > 0 && parseClipUrl(url).ok;

  useEffect(() => {
    if (!looksValid) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      const response = await previewClip(url).catch(() => ({
        ok: false as const,
        message: "Couldn't check the link.",
      }));
      if (!active) return;
      setResult(
        response.ok
          ? { status: "ready", url, preview: response.preview }
          : { status: "error", url, message: response.message },
      );
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [url, looksValid]);

  if (!url) return { status: "empty" };
  if (!looksValid) {
    const parsed = parseClipUrl(url);
    // Say what's wrong only once the link is clearly a full address.
    return !parsed.ok && /^https?:\/\/\S+\.\S+\/\S/.test(url)
      ? { status: "error", url, message: unsupportedMessage(parsed.error) }
      : { status: "empty" };
  }
  return "url" in result && result.url === url ? result : { status: "loading", url };
}

function unsupportedMessage(error: string): string {
  return error === "unsupported_site"
    ? "We take clips from Twitch, YouTube and TikTok only."
    : "That link doesn't point to a single clip or video.";
}
