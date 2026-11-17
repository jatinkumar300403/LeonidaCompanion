"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  describedBy,
  FactStatusPicker,
  Field,
  SpoilerPicker,
  TagPicker,
  useUnsavedGuard,
} from "@/components/admin/editor-fields";
import { Notice } from "@/components/shared/form-bits";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ARTICLE_STATUS_LABELS,
  ARTICLE_TYPE_INFO,
  articlePath,
  SUMMARY_MAX,
  TITLE_MAX,
  type ArticleStatus,
  type ArticleType,
} from "@/config/articles";
import type { FactStatus, SpoilerLevel } from "@/config/tags";
import { extractToc } from "@/lib/articles/content";
import { slugify } from "@/lib/articles/slug";
import { hostnameOf } from "@/lib/format";
import { pageTitle } from "@/lib/seo/metadata";
import { ogImagePath } from "@/lib/seo/og";
import type { ArticleSource } from "@/lib/validation/article";
import {
  deleteArticle,
  saveArticle,
  setArticleStatus,
  uploadCoverImage,
  type ArticleActionResult,
  type SaveIntent,
} from "@/server/articles/actions";
import type { Article } from "@/server/articles/model";

/**
 * Full article editor (SPEC §10): markdown with a live preview, cover upload, TOC preview, Google
 * snippet + OG preview, sources, spoiler level, fact status and schedule. Drafts autosave every 5 s
 * while there are changes; published articles change only on Update (D-057) and keep a local
 * backup meanwhile. An unsaved-changes guard covers reloads and in-app links.
 */
type Values = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  tags: string[];
  spoilerLevel: SpoilerLevel;
  factStatus: FactStatus | "";
  sources: ArticleSource[];
  coverImageUrl: string;
  publishAt: string;
};

type Meta = {
  id: string | null;
  status: ArticleStatus | "new";
  publishedAt: string | null;
  slug: string;
  updatedAt: string | null;
};

const AUTOSAVE_MS = 5000;

function fromArticle(article: Article | null): Values {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    summary: article?.summary ?? "",
    body: article?.bodyMd ?? "",
    tags: article?.tags ?? [],
    spoilerLevel: article?.spoilerLevel ?? "none",
    factStatus: article?.factStatus ?? "",
    sources: article?.sources ?? [],
    coverImageUrl: article?.coverImageUrl ?? "",
    publishAt: "",
  };
}

/** datetime-local value (viewer's time zone) ↔ ISO instant. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

const today = () => new Date().toISOString().slice(0, 10);

/** Live = published with a date that has passed; published with a future date = scheduled. */
function isLiveNow(meta: Pick<Meta, "status" | "publishedAt">): boolean {
  return meta.status === "published" && meta.publishedAt !== null && Date.parse(meta.publishedAt) <= Date.now();
}

export function ArticleEditor({
  type,
  article,
  siteUrl,
  siteName,
}: {
  type: ArticleType;
  article: Article | null;
  siteUrl: string;
  siteName: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => fromArticle(article));
  const [meta, setMeta] = useState<Meta>({
    id: article?.id ?? null,
    status: article?.status ?? "new",
    publishedAt: article?.publishedAt ?? null,
    slug: article?.slug ?? "",
    updatedAt: article?.updatedAt ?? null,
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [scheduleAt, setScheduleAt] = useState(() =>
    article?.publishedAt && Date.parse(article.publishedAt) > Date.now() ? toLocalInput(article.publishedAt) : "",
  );
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ArticleActionResult | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const version = useRef(0);
  const saving = useRef(false);

  const live = isLiveNow(meta);
  const scheduled = meta.status === "published" && !live;
  const everLive = meta.status === "published" || meta.status === "archived";
  const autosaves = meta.status === "new" || meta.status === "draft" || meta.status === "review";
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const info = ARTICLE_TYPE_INFO[type];
  const backupKey = meta.id ? `la:article-backup:${meta.id}` : null;

  useUnsavedGuard(dirty);

  const update = useCallback(
    <K extends keyof Values>(key: K, value: Values[K]) => {
      version.current += 1;
      setDirty(true);
      setValues((current) => {
        const next = { ...current, [key]: value };
        if (key === "title" && !slugTouched && !everLive) next.slug = slugify(String(value));
        return next;
      });
    },
    [slugTouched, everLive],
  );

  const payload = useCallback(
    (intent: SaveIntent) => ({
      type,
      ...values,
      publishAt: intent === "schedule" ? toIso(scheduleAt) : "",
    }),
    [type, values, scheduleAt],
  );

  const applyResult = useCallback(
    (res: ArticleActionResult, sentVersion: number, intent: SaveIntent) => {
      if (!res.ok) {
        setResult(res);
        if (intent !== "autosave") toast.error(res.message);
        return;
      }
      setResult(intent === "autosave" ? null : res);
      const a = res.article;
      const isNew = meta.id === null;
      setMeta({ id: a.id, status: a.status, publishedAt: a.publishedAt, slug: a.slug, updatedAt: a.updatedAt });
      setValues((current) => ({ ...current, slug: a.slug }));
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      if (version.current === sentVersion) setDirty(false);
      if (intent !== "autosave") toast.success(res.message);
      try {
        if (a.status === "published") window.localStorage.removeItem(`la:article-backup:${a.id}`);
      } catch {}
      if (isNew) window.history.replaceState(null, "", `/admin/articles/${a.id}`);
    },
    [meta.id],
  );

  function save(intent: SaveIntent) {
    const sentVersion = version.current;
    startTransition(async () => {
      saving.current = true;
      try {
        applyResult(await saveArticle(meta.id, payload(intent), intent), sentVersion, intent);
      } finally {
        saving.current = false;
      }
    });
  }

  // Autosave drafts every 5 s while there are unsaved changes (and a title to save under).
  useEffect(() => {
    if (!dirty || !autosaves || !values.title.trim()) return;
    const timer = setTimeout(async () => {
      if (saving.current) return;
      saving.current = true;
      const sentVersion = version.current;
      try {
        applyResult(await saveArticle(meta.id, payload("autosave"), "autosave"), sentVersion, "autosave");
      } finally {
        saving.current = false;
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, autosaves, values, meta.id, payload, applyResult]);

  // Live articles aren't autosaved: keep a local backup of unsaved edits instead.
  useEffect(() => {
    if (!backupKey || autosaves || !dirty) return;
    try {
      window.localStorage.setItem(backupKey, JSON.stringify({ at: Date.now(), values }));
    } catch {}
  }, [backupKey, autosaves, dirty, values]);

  const [backup, setBackup] = useState<Values | null>(null);
  useEffect(() => {
    if (!backupKey || autosaves) return;
    try {
      const raw = window.localStorage.getItem(backupKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { at: number; values: Values };
      if (meta.updatedAt && parsed.at > Date.parse(meta.updatedAt)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after mount
        setBackup(parsed.values);
      }
    } catch {}
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeStatus(action: "unpublish" | "archive" | "restore") {
    startTransition(async () => {
      const res = await setArticleStatus(meta.id!, action);
      applyResult(res, version.current, "draft");
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteArticle(meta.id!);
      if (res.ok) {
        setDirty(false);
        toast.success(res.message);
        router.push("/admin/articles");
      } else toast.error(res.message);
    });
  }

  async function onCoverSelected(file: File | undefined) {
    if (!file || !meta.id) return;
    setUploading(true);
    const form = new FormData();
    form.set("articleId", meta.id);
    form.set("cover", file);
    const res = await uploadCoverImage(form);
    setUploading(false);
    if (res.ok) update("coverImageUrl", res.url);
    else toast.error(res.message);
  }

  const publicUrl = meta.id && live ? articlePath(type, meta.slug) : null;
  const toc = extractToc(values.body);
  const snippetTitle = `${pageTitle(values.title || "Untitled", info.section)} | ${siteName}`;
  const statusLabel = meta.status === "new" ? "New" : scheduled ? "Scheduled" : ARTICLE_STATUS_LABELS[meta.status];

  return (
    <div className="flex flex-col gap-6 pb-28 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8 lg:pb-0">
      <div className="flex min-w-0 flex-col gap-6">
        {backup ? (
          <Notice tone="info" title="Unsaved changes found">
            <p>You have edits from an earlier visit that were never published.</p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  setValues(backup);
                  setDirty(true);
                  setBackup(null);
                }}
              >
                Restore them
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  if (backupKey) window.localStorage.removeItem(backupKey);
                  setBackup(null);
                }}
              >
                Discard
              </Button>
            </div>
          </Notice>
        ) : null}
        {result && !result.ok ? <Notice tone="error">{result.message}</Notice> : null}

        <Field id="title" label="Title" error={errors.title} counter={`${values.title.length}/${TITLE_MAX}`}>
          <Input
            id="title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            maxLength={TITLE_MAX}
            className="h-12 text-base font-semibold"
            {...describedBy("title", false, errors.title)}
          />
        </Field>

        <Field
          id="slug"
          label="Slug"
          hint={
            everLive
              ? "Locked: this article has been live, so its link can't change."
              : `URL: ${info.index ?? ""}/${values.slug || "…"}`
          }
          error={errors.slug}
        >
          <Input
            id="slug"
            value={values.slug}
            disabled={everLive}
            onChange={(event) => {
              setSlugTouched(true);
              update("slug", event.target.value.toLowerCase());
            }}
            className="font-mono text-sm"
            {...describedBy("slug", true, errors.slug)}
          />
        </Field>

        <Field
          id="summary"
          label="Summary"
          hint="One or two sentences. It's the lede and the Google description."
          error={errors.summary}
          counter={`${values.summary.length}/${SUMMARY_MAX}`}
        >
          <Textarea
            id="summary"
            value={values.summary}
            onChange={(event) => update("summary", event.target.value)}
            maxLength={SUMMARY_MAX}
            rows={3}
            {...describedBy("summary", true, errors.summary)}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className="text-sm font-semibold">
            Body
          </label>
          <MarkdownEditor
            id="body"
            value={values.body}
            onChange={(body) => update("body", body)}
            invalid={Boolean(errors.body)}
            describedBy={errors.body ? "body-error" : undefined}
            placeholder="## A heading&#10;&#10;Write in markdown. > [!TIP] callouts, ||spoilers|| and ::youtube[id] work."
          />
          {errors.body ? (
            <p id="body-error" className="text-sm text-destructive">
              {errors.body}
            </p>
          ) : null}
        </div>

        <SourcesEditor
          sources={values.sources}
          onChange={(sources) => update("sources", sources)}
          error={errors.sources ?? Object.entries(errors).find(([key]) => key.startsWith("sources."))?.[1]}
        />
      </div>

      <aside className="flex flex-col gap-6">
        <section aria-labelledby="publish-heading" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="publish-heading" className="text-base font-semibold">
              {info.label}
            </h2>
            <Badge variant={live ? "teal" : scheduled ? "orange" : "secondary"}>{statusLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {pending
              ? "Saving…"
              : dirty
                ? autosaves
                  ? "Unsaved changes (autosaves)"
                  : "Unsaved changes"
                : savedAt
                  ? `Saved at ${savedAt}`
                  : "No changes"}
          </p>
          {publicUrl ? (
            <Link href={publicUrl} className="inline-flex items-center gap-1 link-dusk text-sm" target="_blank">
              View live page
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}

          <div className="hidden flex-col gap-2 lg:flex">
            <PrimaryActions
              live={live}
              scheduled={scheduled}
              status={meta.status}
              pending={pending}
              onSave={save}
              onStatus={changeStatus}
            />
          </div>

          {meta.status !== "archived" ? (
            <div className="flex flex-col gap-2 border-t pt-3">
              <label htmlFor="schedule" className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock className="size-4" aria-hidden="true" />
                Schedule
              </label>
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                {...describedBy("schedule", false, errors.publishAt)}
              />
              <p className="text-xs text-muted-foreground">Your local time. Goes live within 10 minutes of it.</p>
              {errors.publishAt ? <p className="text-sm text-destructive">{errors.publishAt}</p> : null}
              <Button
                type="button"
                variant="secondary"
                disabled={pending || !scheduleAt}
                onClick={() => save("schedule")}
              >
                {scheduled ? "Reschedule" : "Schedule"}
              </Button>
            </div>
          ) : null}

          {meta.id ? (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {live || scheduled ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => changeStatus("unpublish")}
                >
                  Unpublish
                </Button>
              ) : null}
              {meta.status !== "archived" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => changeStatus("archive")}
                >
                  Archive
                </Button>
              ) : null}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="ghost" className="text-destructive">
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this article?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes “{values.title || "Untitled"}” for good. Archive it instead if you might want it
                      back.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="meta-heading" className="flex flex-col gap-5 rounded-xl border bg-card p-4">
          <h2 id="meta-heading" className="text-base font-semibold">
            Details
          </h2>
          <TagPicker value={values.tags} onChange={(tags) => update("tags", tags)} error={errors.tags} />
          <SpoilerPicker value={values.spoilerLevel} onChange={(level) => update("spoilerLevel", level)} />
          {type === "fact" ? (
            <FactStatusPicker
              value={values.factStatus}
              onChange={(status) => update("factStatus", status)}
              error={errors.factStatus}
            />
          ) : null}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Cover image</span>
            {values.coverImageUrl ? (
              <div className="relative aspect-video overflow-hidden rounded-lg border bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of our own upload */}
                <img src={values.coverImageUrl} alt="" className="size-full object-cover" />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  aria-label="Remove cover image"
                  onClick={() => update("coverImageUrl", "")}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ) : null}
            {meta.id ? (
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus className="size-4" aria-hidden="true" />
                )}
                {uploading ? "Uploading…" : values.coverImageUrl ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => void onCoverSelected(event.target.files?.[0])}
                />
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">Save once (it autosaves), then add a cover.</p>
            )}
            {errors.coverImageUrl ? <p className="text-sm text-destructive">{errors.coverImageUrl}</p> : null}
          </div>
        </section>

        <section aria-labelledby="seo-heading" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h2 id="seo-heading" className="text-base font-semibold">
            Google preview
          </h2>
          <div className="rounded-lg border bg-background p-3">
            <p className="truncate text-xs text-muted-foreground">
              {hostnameOf(siteUrl) ?? siteUrl} › {info.section.toLowerCase()} › {values.slug || "…"}
            </p>
            <p className="mt-1 line-clamp-2 text-base leading-snug text-violet-text">{snippetTitle}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {values.summary || "Add a summary: Google shows it here."}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Share image</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated OG preview */}
          <img
            src={ogImagePath(values.title || "Untitled", info.section)}
            alt="Preview of the image shown when this page is shared"
            className="aspect-[1200/630] w-full rounded-lg border"
            loading="lazy"
          />
          {toc.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">Table of contents</p>
              <ol className="flex flex-col gap-1 text-sm">
                {toc.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-4 text-muted-foreground" : ""}>
                    {item.text}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </section>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="flex gap-2">
          <PrimaryActions
            live={live}
            scheduled={scheduled}
            status={meta.status}
            pending={pending}
            onSave={save}
            onStatus={changeStatus}
            compact
          />
        </div>
      </div>
    </div>
  );
}

function PrimaryActions({
  live,
  scheduled,
  status,
  pending,
  onSave,
  onStatus,
  compact = false,
}: {
  live: boolean;
  scheduled: boolean;
  status: ArticleStatus | "new";
  pending: boolean;
  onSave: (intent: SaveIntent) => void;
  onStatus: (action: "restore") => void;
  compact?: boolean;
}) {
  const grow = compact ? "flex-1" : "w-full";
  if (status === "archived") {
    return (
      <Button type="button" className={grow} disabled={pending} onClick={() => onStatus("restore")}>
        Restore as draft
      </Button>
    );
  }
  if (live) {
    return (
      <Button type="button" className={grow} disabled={pending} onClick={() => onSave("update")}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Update live article
      </Button>
    );
  }
  return (
    <>
      <Button type="button" variant="secondary" className={grow} disabled={pending} onClick={() => onSave("draft")}>
        Save draft
      </Button>
      {!compact && status !== "review" && !scheduled ? (
        <Button type="button" variant="outline" className={grow} disabled={pending} onClick={() => onSave("review")}>
          Send for review
        </Button>
      ) : null}
      <Button type="button" className={grow} disabled={pending} onClick={() => onSave("publish")}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {scheduled ? "Publish now" : "Publish"}
      </Button>
    </>
  );
}

/** Numbered sources: title, link and the date it was checked (SPEC §4, rule 7). */
function SourcesEditor({
  sources,
  onChange,
  error,
}: {
  sources: ArticleSource[];
  onChange: (sources: ArticleSource[]) => void;
  error?: string;
}) {
  const set = (index: number, patch: Partial<ArticleSource>) =>
    onChange(sources.map((source, i) => (i === index ? { ...source, ...patch } : source)));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">Sources</legend>
      {sources.map((source, index) => (
        <div key={index} className="grid gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-[1fr_1fr_9.5rem_auto]">
          <Input
            aria-label={`Source ${index + 1} title`}
            placeholder="Title (e.g. Official site)"
            value={source.title}
            onChange={(event) => set(index, { title: event.target.value })}
          />
          <Input
            aria-label={`Source ${index + 1} link`}
            placeholder="https://"
            type="url"
            inputMode="url"
            value={source.url}
            onChange={(event) => set(index, { url: event.target.value })}
          />
          <Input
            aria-label={`Source ${index + 1} accessed on`}
            type="date"
            value={source.accessed_at}
            onChange={(event) => set(index, { accessed_at: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove source ${index + 1}`}
            onClick={() => onChange(sources.filter((_, i) => i !== index))}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="w-fit"
        onClick={() => onChange([...sources, { title: "", url: "", accessed_at: today() }])}
      >
        <Plus aria-hidden="true" />
        Add source
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </fieldset>
  );
}
