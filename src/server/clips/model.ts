import type { ClipCategory } from "@/config/tags";
import { clipOrientation } from "@/lib/clips/parse";
import type { ClipDetail, ClipPlatform, ClipQueueItem, ClipSource, ClipStatus, ClipSummary } from "@/types/content";
import type { Database } from "@/types/database";

/** Database rows → the clip view models the UI renders (src/types/content.ts). */

export type ClipRow = Database["public"]["Tables"]["clips"]["Row"];

export const CLIP_COLUMNS =
  "id, platform, external_id, url, title, caption, creator_name, creator_url, duration_sec, thumbnail_url, category, source, submitted_by, status, reject_reason, score, views_on_platform, created_at, approved_at";

export function toClipSummary(row: ClipRow): ClipSummary {
  const platform = row.platform as ClipPlatform;
  return {
    id: row.id,
    platform,
    embedId: row.external_id,
    url: row.url,
    title: row.title,
    creatorName: row.creator_name,
    creatorUrl: row.creator_url,
    durationSec: row.duration_sec,
    thumbnailUrl: row.thumbnail_url,
    category: row.category as ClipCategory,
    score: row.score,
    orientation: clipOrientation(platform, row.url),
    caption: row.caption,
    submittedBy: row.submitted_by,
  };
}

export function toClipDetail(row: ClipRow, submitterUsername: string | null): ClipDetail {
  return {
    ...toClipSummary(row),
    source: row.source as ClipSource,
    submitterUsername,
    viewsOnPlatform: row.views_on_platform,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

export function toClipQueueItem(row: ClipRow, submitterUsername: string | null): ClipQueueItem {
  return {
    ...toClipDetail(row, submitterUsername),
    status: row.status as ClipStatus,
    rejectReason: row.reject_reason,
  };
}
