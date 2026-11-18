import type { Route } from "next";

/**
 * In-app notification text and links (SPEC §9: replies, mentions, accepted answers, clips, mod
 * actions). Pure and client-safe: the bell renders rows it reads in the browser.
 */
export type NotificationRow = {
  id: number;
  type: string;
  payload: unknown;
  read_at: string | null;
  created_at: string;
};

export type NotificationView = { id: number; text: string; href: Route | null; unread: boolean; createdAt: string };

type Payload = {
  thread_id?: unknown;
  thread_slug?: unknown;
  thread_title?: unknown;
  post_id?: unknown;
  actor?: unknown;
  clip_id?: unknown;
  clip_title?: unknown;
  message?: unknown;
};

const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;

function clip(text: string, max = 70): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Link to a thread (and post anchor). A missing slug still works: the thread page redirects. */
export function threadHref(threadId: number, slug: string | null, postId?: number | null): Route {
  const base = `/forum/t/${threadId}/${encodeURIComponent(slug || "thread")}`;
  return (postId ? `${base}#post-${postId}` : base) as Route;
}

export function describeNotification(row: NotificationRow): NotificationView {
  const p = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Payload;
  const actor = str(p.actor) ? `@${str(p.actor)}` : "Someone";
  const title = str(p.thread_title) ? `“${clip(str(p.thread_title)!)}”` : "a thread";
  const threadId = num(p.thread_id);
  const forumHref = threadId ? threadHref(threadId, str(p.thread_slug), num(p.post_id)) : null;

  let text: string;
  let href: Route | null = forumHref;
  switch (row.type) {
    case "thread_reply":
      text = `${actor} replied to your thread ${title}`;
      break;
    case "post_reply":
      text = `${actor} replied to your post in ${title}`;
      break;
    case "mention":
      text = `${actor} mentioned you in ${title}`;
      break;
    case "answer_accepted":
      text = `Your answer was accepted in ${title}`;
      break;
    case "clip_approved":
    case "clip_rejected": {
      const clipId = num(p.clip_id);
      const name = str(p.clip_title) ? `“${clip(str(p.clip_title)!)}”` : "Your clip";
      text = row.type === "clip_approved" ? `${name} was approved` : `${name} wasn't approved`;
      href = clipId && row.type === "clip_approved" ? (`/clips/${clipId}` as Route) : null;
      break;
    }
    case "mod_action":
      text = str(p.message) ?? "A moderator acted on your content";
      break;
    case "mod_alert":
      // Staff only (SPEC §8.2: a self-harm hold notifies admins).
      text = str(p.message) ?? "Something needs a moderator";
      href = "/admin/moderation" as Route;
      break;
    default:
      text = str(p.message) ?? "You have a new notification";
  }
  return { id: row.id, text, href, unread: row.read_at === null, createdAt: row.created_at };
}
