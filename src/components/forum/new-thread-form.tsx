"use client";

import { CircleCheck, EyeOff, Link2Off, MessageSquare } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { TagPicker } from "@/components/forum/tag-picker";
import { FieldError, Notice } from "@/components/shared/form-bits";
import { submitWithoutReset } from "@/components/shared/form-submit";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { containsLink, LINKS_MIN_REPUTATION, NEW_ACCOUNT, THREAD_LIMITS } from "@/lib/forum/rules";
import { cn } from "@/lib/utils";
import { createThread, type FormState } from "@/server/forum/actions";

export type CategoryOption = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  isQa: boolean;
  spoilersAllowed: boolean;
};

type Similar = { id: number; title: string; url: string; solved: boolean; replyCount: number };

/**
 * /forum/new (SPEC §5): category, title (with "similar threads" while typing, to cut duplicates),
 * markdown body, up to 5 tags and a spoiler toggle (always on in Missions & Story). Turnstile
 * mounts on first focus (D-063). Success redirects to the new thread.
 */
export function NewThreadForm({
  categories,
  initialCategory,
  initialTitle,
  canLink,
  isNewAccount,
}: {
  categories: CategoryOption[];
  initialCategory: string | null;
  initialTitle: string;
  canLink: boolean;
  isNewAccount: boolean;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState<FormState, FormData>(createThread, { status: "idle" });
  const [categoryId, setCategoryId] = useState<number | null>(
    categories.find((category) => category.slug === initialCategory)?.id ?? null,
  );
  const [title, setTitle] = useState(initialTitle.slice(0, THREAD_LIMITS.titleMax));
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [spoiler, setSpoiler] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const similar = useSimilarThreads(title);

  const category = categories.find((option) => option.id === categoryId) ?? null;
  const spoilerForced = Boolean(category?.spoilersAllowed);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError = state.status === "error" ? state.message : null;
  const linkWarning = !canLink && containsLink(`${title} ${body}`);

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset(formAction)}
      onFocusCapture={() => setEngaged(true)}
      className="flex flex-col gap-8"
      noValidate
    >
      {isNewAccount ? (
        <Notice tone="info" title="New here? Welcome.">
          New accounts can start {NEW_ACCOUNT.threadsPerDay} threads and post {NEW_ACCOUNT.postsPerDay} replies a day,
          and links unlock at {LINKS_MIN_REPUTATION} reputation.
        </Notice>
      ) : null}

      <fieldset aria-describedby={errors.categoryId ? `${id}-category-error` : undefined}>
        <legend className="text-sm font-semibold">Category</legend>
        <input type="hidden" name="categoryId" value={categoryId ?? ""} />
        <div role="radiogroup" aria-label="Category" className="mt-3 grid gap-2 sm:grid-cols-2">
          {categories.map((option) => {
            const selected = option.id === categoryId;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategoryId(option.id)}
                className={cn(
                  "flex flex-col items-start rounded-[10px] border p-3 text-left transition-colors",
                  selected ? "border-pink/50 bg-pink/8" : "bg-surface hover:bg-accent/50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {selected ? <CircleCheck className="size-4 text-pink-text" aria-hidden="true" /> : null}
                  {option.name}
                </span>
                {option.description ? (
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{option.description}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <FieldError id={`${id}-category-error`} message={errors.categoryId} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${id}-title`}>Title</Label>
        <Input
          id={`${id}-title`}
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={THREAD_LIMITS.titleMax}
          placeholder={category?.isQa ? "How do I…? Where is…?" : "What's it about?"}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={`${id}-title-hint${errors.title ? ` ${id}-title-error` : ""}`}
          autoComplete="off"
        />
        <p id={`${id}-title-hint`} className="text-xs text-muted-foreground">
          {title.trim().length}/{THREAD_LIMITS.titleMax} · at least {THREAD_LIMITS.titleMin} characters
          {spoilerForced ? ". Keep the title spoiler-free." : "."}
        </p>
        <FieldError id={`${id}-title-error`} message={errors.title} />
        {similar.length > 0 ? (
          <div className="rounded-[10px] border bg-surface-2 p-3" aria-live="polite">
            <p className="text-sm font-medium">Similar threads: maybe it&apos;s already answered</p>
            <ul className="mt-2 space-y-1.5">
              {similar.map((thread) => (
                <li key={thread.id} className="flex items-start gap-2 text-sm">
                  {thread.solved ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-teal-text" aria-label="Solved" />
                  ) : (
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <a href={thread.url} target="_blank" rel="noopener" className="underline-offset-2 hover:underline">
                    {thread.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-body`}>Details</Label>
        <input type="hidden" name="body" value={body} />
        <MarkdownEditor
          id={`${id}-body`}
          value={body}
          onChange={setBody}
          youtube={false}
          mentions
          compact
          placeholder="What have you tried? Which mission or area? Use ||text|| to hide spoilers."
          invalid={Boolean(errors.body)}
          describedBy={errors.body ? `${id}-body-error` : undefined}
        />
        <FieldError id={`${id}-body-error`} message={errors.body} />
        {linkWarning ? (
          <p className="flex items-start gap-1.5 text-sm text-orange-text">
            <Link2Off className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Links unlock at {LINKS_MIN_REPUTATION} reputation. Describe the source instead, or remove the link.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p id={`${id}-tags`} className="text-sm font-semibold">
          Tags <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <TagPicker value={tags} onChange={setTags} name="tags" labelledBy={`${id}-tags`} />
        <FieldError id={`${id}-tags-error`} message={errors.tags} />
      </div>

      <div className="flex items-start gap-3">
        <Switch
          id={`${id}-spoiler`}
          name="isSpoiler"
          checked={spoilerForced || spoiler}
          onCheckedChange={setSpoiler}
          disabled={spoilerForced}
          aria-describedby={`${id}-spoiler-hint`}
        />
        <div>
          <Label htmlFor={`${id}-spoiler`} className="inline-flex items-center gap-1.5">
            <EyeOff className="size-4" aria-hidden="true" />
            Contains story spoilers
          </Label>
          <p id={`${id}-spoiler-hint`} className="mt-1 text-xs text-muted-foreground">
            {spoilerForced
              ? `Always on in ${category?.name}: every post there sits behind a spoiler warning.`
              : "Blurs the preview in lists and hides the question until readers choose to see it."}
          </p>
          {spoilerForced ? <input type="hidden" name="isSpoiler" value="on" /> : null}
        </div>
      </div>

      {engaged ? <TurnstileField action="forum-thread" /> : null}

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Posting…" : "Post thread"}
        </Button>
      </div>
    </form>
  );
}

/** Debounced lookup of threads with a similar title (GET /api/forum/similar). */
function useSimilarThreads(title: string): Similar[] {
  const [results, setResults] = useState<{ query: string; threads: Similar[] }>({ query: "", threads: [] });
  const query = title.trim();

  useEffect(() => {
    if (query.length < 6) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/forum/similar?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { threads: Similar[] };
        setResults({ query, threads: data.threads });
      } catch {
        // Aborted or offline: suggestions are a nice-to-have.
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return query.length >= 6 && results.query === query ? results.threads : [];
}
