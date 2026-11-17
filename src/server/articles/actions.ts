"use server";

import type { Route } from "next";
import { articlePath, type ArticleType } from "@/config/articles";
import { publicEnv } from "@/env.client";
import { deriveSummary } from "@/lib/articles/content";
import { slugify, uniqueSlug } from "@/lib/articles/slug";
import { hostnameOf } from "@/lib/format";
import { rateLimit, rateLimitMessage, type RateLimitResult } from "@/lib/ratelimit/limit";
import type { RateLimitScope } from "@/lib/ratelimit/keys";
import {
  articleFieldErrors,
  articleInputSchema,
  isOwnCoverUrl,
  publishProblems,
  quickTipSchema,
  type ArticleInput,
} from "@/lib/validation/article";
import { getAdminArticle, takenSlugs } from "@/server/articles/admin-queries";
import { CoverError, processCoverImage } from "@/server/articles/cover";
import { DETAIL_COLUMNS, toArticle, type Article } from "@/server/articles/model";
import { invalidateArticle, runPublishPipeline, runUnpublishPipeline } from "@/server/articles/pipeline";
import { requireRole } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { Database } from "@/types/database";

/**
 * Article mutations for the admin CMS (SPEC §4, §10). Every action: admin only (RLS agrees: only
 * admins write articles), rate-limited, zod-validated, then written as the admin under RLS.
 * Publishing runs the pipeline (cache tags, embedding stub, IndexNow).
 */

export type ArticleActionResult =
  | { ok: true; message: string; article: Article; url: Route | null }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export type SaveIntent = "autosave" | "draft" | "review" | "publish" | "schedule" | "update";

type Update = Database["public"]["Tables"]["articles"]["Update"];

const NOT_ALLOWED = "Only admins can edit articles.";
const SCHEDULE_MIN_LEAD_MS = 60_000;

async function guard(scope: RateLimitScope): Promise<{ userId: string } | { error: string }> {
  const session = await requireRole("admin", "/admin/articles");
  if (session.profile.banned) return { error: NOT_ALLOWED };
  const limit: RateLimitResult = await rateLimit(scope, session.userId);
  if (!limit.success) return { error: rateLimitMessage(limit.retryAfterSeconds) };
  return { userId: session.userId };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dbError(error: { code?: string; message: string }): ArticleActionResult {
  if (error.code === "23505") {
    return {
      ok: false,
      message: "That slug is already used by another article of this type.",
      fieldErrors: { slug: "Pick another slug." },
    };
  }
  if (error.message.includes("articles_published_fact_status")) {
    return {
      ok: false,
      message: "Facts need a status before they go live.",
      fieldErrors: { factStatus: "Pick a status." },
    };
  }
  if (error.message.includes("articles_confirmed_needs_source")) {
    return {
      ok: false,
      message: "A confirmed fact needs its official source.",
      fieldErrors: { sources: "Add the source." },
    };
  }
  console.error("[articles] write failed:", error.code, error.message);
  return { ok: false, message: "We couldn't save the article. Please try again." };
}

async function freeSlug(type: ArticleType, wanted: string, excludeId?: string): Promise<string> {
  const base = wanted || "article";
  return uniqueSlug(base, await takenSlugs(type, base, excludeId));
}

function isLive(article: Pick<Article, "status" | "publishedAt">, now = Date.now()): boolean {
  return article.status === "published" && Boolean(article.publishedAt) && Date.parse(article.publishedAt!) <= now;
}

/** SPEC §10 Quick Tip: title + 2–5 sentences + optional source + tags → published in one tap. */
export async function quickPublishTip(
  raw: unknown,
  intent: "publish" | "draft" = "publish",
): Promise<ArticleActionResult> {
  const gate = await guard("articleWrite");
  if ("error" in gate) return { ok: false, message: gate.error };

  const parsed = quickTipSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: articleFieldErrors(parsed.error) };
  }
  const tip = parsed.data;
  const now = new Date().toISOString();
  const publish = intent === "publish";
  const sources = tip.sourceUrl
    ? [{ title: hostnameOf(tip.sourceUrl) ?? "Source", url: tip.sourceUrl, accessed_at: today() }]
    : [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .insert({
      type: "tip",
      slug: await freeSlug("tip", slugify(tip.title)),
      title: tip.title,
      summary: deriveSummary(tip.body),
      body_md: tip.body,
      tags: tip.tags,
      spoiler_level: tip.spoilerLevel,
      sources,
      status: publish ? "published" : "draft",
      published_at: publish ? now : null,
      pipeline_ran_at: publish ? now : null,
      author_id: gate.userId,
    })
    .select(DETAIL_COLUMNS)
    .single();
  if (error) return dbError(error);

  const article = toArticle(data);
  if (publish) runPublishPipeline(article, "action");
  return {
    ok: true,
    message: publish ? "Tip published." : "Draft saved.",
    article,
    url: publish ? articlePath("tip", article.slug) : null,
  };
}

/**
 * Full editor save. `id` null creates a draft. Autosave only ever touches drafts and articles in
 * review (D-057); a live article changes only through an explicit Update.
 */
export async function saveArticle(id: string | null, raw: unknown, intent: SaveIntent): Promise<ArticleActionResult> {
  const gate = await guard(intent === "autosave" ? "articleAutosave" : "articleWrite");
  if ("error" in gate) return { ok: false, message: gate.error };

  const parsed = articleInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: articleFieldErrors(parsed.error) };
  }
  const input = parsed.data;
  if (input.coverImageUrl && !isOwnCoverUrl(input.coverImageUrl, publicEnv.supabaseUrl)) {
    return {
      ok: false,
      message: "Upload the cover image here.",
      fieldErrors: { coverImageUrl: "Upload the image here." },
    };
  }

  const existing = id ? await getAdminArticle(id) : null;
  if (id && !existing) return { ok: false, message: "That article no longer exists." };
  if (existing && existing.type !== input.type) return { ok: false, message: "An article's type can't change." };
  if (intent === "autosave" && existing && !["draft", "review"].includes(existing.status)) {
    return { ok: false, message: "Published articles aren't autosaved. Use Update." };
  }

  const goingLive =
    intent === "publish" || intent === "schedule" || (intent === "update" && existing?.status === "published");
  if (goingLive) {
    const problems = publishProblems(input);
    if (Object.keys(problems).length > 0) {
      return { ok: false, message: "A few things are missing before this can go live.", fieldErrors: problems };
    }
  }

  // Slugs lock once an article has been live, so links never break (D-056).
  const everLive = existing ? existing.status === "published" || existing.status === "archived" : false;
  const slug =
    everLive && existing ? existing.slug : await freeSlug(input.type, input.slug || slugify(input.title), existing?.id);

  const fields: Update = {
    title: input.title,
    slug,
    summary: input.summary || null,
    body_md: input.body,
    tags: input.tags,
    spoiler_level: input.spoilerLevel,
    fact_status: input.type === "fact" && input.factStatus ? input.factStatus : null,
    sources: input.sources,
    cover_image_url: input.coverImageUrl || null,
  };

  const now = Date.now();
  switch (intent) {
    case "autosave":
      break;
    case "draft":
    case "review":
      fields.status = intent;
      break;
    case "publish": {
      const keepDate =
        existing?.publishedAt && existing.status === "published" && Date.parse(existing.publishedAt) <= now;
      fields.status = "published";
      fields.published_at = keepDate ? existing!.publishedAt : new Date(now).toISOString();
      fields.pipeline_ran_at = new Date(now).toISOString();
      break;
    }
    case "schedule": {
      const at = input.publishAt ? Date.parse(input.publishAt) : Number.NaN;
      if (!Number.isFinite(at) || at < now + SCHEDULE_MIN_LEAD_MS) {
        return {
          ok: false,
          message: "Pick a time at least a minute from now.",
          fieldErrors: { publishAt: "Pick a future time." },
        };
      }
      fields.status = "published";
      fields.published_at = new Date(at).toISOString();
      fields.pipeline_ran_at = null;
      break;
    }
    case "update":
      if (existing?.status === "published" && existing.publishedAt && Date.parse(existing.publishedAt) <= now) {
        fields.pipeline_ran_at = new Date(now).toISOString();
      }
      break;
  }

  const supabase = await createSupabaseServerClient();
  const result = existing
    ? await supabase.from("articles").update(fields).eq("id", existing.id).select(DETAIL_COLUMNS).single()
    : await supabase
        .from("articles")
        .insert({
          ...fields,
          type: input.type,
          slug,
          title: input.title,
          status: fields.status ?? "draft",
          author_id: gate.userId,
        })
        .select(DETAIL_COLUMNS)
        .single();
  if (result.error) return dbError(result.error);

  const article = toArticle(result.data);
  const wasLive = existing ? isLive(existing, now) : false;
  const live = isLive(article, now);
  const pipelineArticle = { id: article.id, type: article.type, slug: article.slug, previousSlug: existing?.slug };
  if (live && (intent === "publish" || intent === "update")) runPublishPipeline(pipelineArticle, "action");
  else if (wasLive && !live) runUnpublishPipeline(pipelineArticle, "action");
  else if (intent === "schedule") invalidateArticle(pipelineArticle, "action");

  const messages: Record<SaveIntent, string> = {
    autosave: "Saved",
    draft: "Draft saved.",
    review: "Sent for review.",
    publish: "Published.",
    schedule: "Scheduled.",
    update: "Changes are live.",
  };
  return { ok: true, message: messages[intent], article, url: live ? articlePath(article.type, article.slug) : null };
}

/** Unpublish (back to draft), archive, or restore an archived article to draft. */
export async function setArticleStatus(
  id: string,
  action: "unpublish" | "archive" | "restore",
): Promise<ArticleActionResult> {
  const gate = await guard("articleWrite");
  if ("error" in gate) return { ok: false, message: gate.error };
  const existing = await getAdminArticle(id);
  if (!existing) return { ok: false, message: "That article no longer exists." };

  const status = action === "archive" ? "archived" : "draft";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .update({ status, pipeline_ran_at: null })
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .single();
  if (error) return dbError(error);

  const article = toArticle(data);
  if (existing.status === "published") {
    runUnpublishPipeline({ id, type: article.type, slug: article.slug }, "action");
  }
  const messages = {
    unpublish: "Unpublished: it's a draft again.",
    archive: "Archived.",
    restore: "Restored as a draft.",
  };
  return { ok: true, message: messages[action], article, url: null };
}

export async function deleteArticle(id: string): Promise<{ ok: boolean; message: string }> {
  const gate = await guard("articleWrite");
  if ("error" in gate) return { ok: false, message: gate.error };
  const existing = await getAdminArticle(id);
  if (!existing) return { ok: false, message: "That article no longer exists." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return { ok: false, message: "We couldn't delete the article. Please try again." };
  if (existing.status === "published") runUnpublishPipeline({ id, type: existing.type, slug: existing.slug }, "action");
  return { ok: true, message: "Article deleted." };
}

/** Cover upload (SPEC §10): re-encoded with sharp, stored as the admin in article-images/<id>/. */
export async function uploadCoverImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const gate = await guard("coverUpload");
  if ("error" in gate) return { ok: false, message: gate.error };
  const articleId = String(formData.get("articleId") ?? "");
  const file = formData.get("cover");
  if (!/^[0-9a-f-]{36}$/i.test(articleId))
    return { ok: false, message: "Save the article once before adding a cover." };
  if (!(file instanceof File)) return { ok: false, message: "Choose an image first." };

  let webp: Buffer;
  try {
    webp = await processCoverImage(file);
  } catch (error) {
    return { ok: false, message: error instanceof CoverError ? error.message : "That image didn't work." };
  }

  const supabase = await createSupabaseServerClient();
  const path = `${articleId}/${crypto.randomUUID()}.webp`;
  const upload = await supabase.storage
    .from("article-images")
    .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error("[articles] cover upload failed:", upload.error.message);
    return { ok: false, message: "We couldn't upload the image. Please try again." };
  }
  return { ok: true, url: supabase.storage.from("article-images").getPublicUrl(path).data.publicUrl };
}

export type { ArticleInput };
