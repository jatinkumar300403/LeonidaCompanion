/** Readable names for audit-log actions (the Recent actions tab, user history). Pure. */
const TARGET: Record<string, string> = {
  thread: "thread",
  post: "reply",
  clip: "clip",
  profile: "profile",
  article: "article",
  dmca: "removal request",
  site_settings: "settings",
};

const FIXED: Record<string, string> = {
  ai_hold: "AI held",
  ai_reject: "AI refused",
  shadow_hold: "New-account hold",
  ban: "Banned",
  unban: "Lifted ban on",
  role_change: "Changed role of",
  flags_update: "Changed feature flags",
  reports_dismissed: "Dismissed reports on",
  thread_move: "Moved",
};

const VERBS: Record<string, string> = {
  approve: "Approved",
  remove: "Removed",
  restore: "Restored",
  lock: "Locked",
  unlock: "Unlocked",
  reject: "Rejected",
};

export function actionText(action: string, targetType: string): string {
  const target = TARGET[targetType] ?? targetType.replace(/_/g, " ");
  if (action === "flags_update") return FIXED[action]!;
  if (FIXED[action]) return `${FIXED[action]} ${action === "thread_move" ? "a thread" : `a ${target}`}`;
  const [kind, verb] = action.split("_");
  if (verb && VERBS[verb] && TARGET[kind ?? ""]) return `${VERBS[verb]} a ${TARGET[kind!]}`;
  return action.replace(/_/g, " ");
}
