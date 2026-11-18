import { EDIT_WINDOW_MS, LINKS_MIN_REPUTATION, NEW_ACCOUNT } from "@/lib/forum/rules";

/**
 * Database refusals → messages people can act on. The triggers raise these exact names
 * (supabase/migrations/20261117170300_forum.sql and 20261118130000_forum_phase4.sql).
 */
const MESSAGES: Record<string, string> = {
  new_account_thread_limit: `New accounts can start ${NEW_ACCOUNT.threadsPerDay} threads a day. Reply to an existing thread, or try again tomorrow.`,
  new_account_post_limit: `New accounts can post ${NEW_ACCOUNT.postsPerDay} replies a day. Please try again tomorrow.`,
  links_need_reputation: `Links unlock at ${LINKS_MIN_REPUTATION} reputation, once your account is a day old. Remove the link and try again.`,
  edit_window_closed: `Posts can be edited for ${EDIT_WINDOW_MS / 60_000} minutes after posting. You can still delete it.`,
  thread_not_editable: "This thread is locked or under review, so it can't be changed.",
  post_not_editable: "This reply is under review or removed, so it can't be changed.",
  status_change_not_allowed: "Only moderators can do that.",
  only_mods_move_threads: "Only moderators can move threads.",
  invalid_accepted_post: "That reply can't be accepted. It may have been deleted.",
  invalid_reply_target: "The reply you quoted isn't in this thread.",
  cannot_vote_on_own_content: "You can't vote on your own posts.",
  vote_target_not_found: "That post no longer exists.",
};

export type DbError = { code?: string | null; message: string };

/** A message for a known refusal, or null so the caller can log it and show a generic one. */
export function forumErrorMessage(error: DbError): string | null {
  for (const [name, message] of Object.entries(MESSAGES)) {
    if (error.message.includes(name)) return message;
  }
  if (/row-level security/i.test(error.message) || error.code === "42501") {
    return "You can't post here. The thread or category may be locked, or your account is suspended.";
  }
  return null;
}
