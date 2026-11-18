import { z } from "zod";
import { REPORT_TARGETS } from "@/config/forum";

/** Inputs for the moderation tools (SPEC §5 mod tools, §10 queue, users, flags; D-084). */

const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const reason = z.string().trim().max(500, "Keep the reason under 500 characters.");
export const uuidSchema = z.uuid("That user doesn't exist.");

export const CONTENT_DECISIONS = ["approve", "remove", "restore", "lock", "unlock"] as const;
export type ContentDecision = (typeof CONTENT_DECISIONS)[number];

/** Which decisions make sense for which kind of item. */
const ALLOWED: Record<"thread" | "post" | "clip", readonly ContentDecision[]> = {
  thread: ["approve", "remove", "restore", "lock", "unlock"],
  post: ["approve", "remove", "restore"],
  clip: ["remove"],
};

export const contentDecisionSchema = z
  .object({
    targetType: z.enum(["thread", "post", "clip"]),
    id,
    decision: z.enum(CONTENT_DECISIONS),
    reason: reason.optional().transform((value) => value || null),
  })
  .refine((input) => ALLOWED[input.targetType].includes(input.decision), {
    message: "That action doesn't apply here.",
    path: ["decision"],
  })
  .refine((input) => input.targetType !== "clip" || (input.reason?.length ?? 0) >= 2, {
    message: "Give a reason: the submitter sees it.",
    path: ["reason"],
  });
export type ContentDecisionInput = z.input<typeof contentDecisionSchema>;

export const moveThreadSchema = z.object({ id, categoryId: id });

export const RESOLVE_TARGETS = [...REPORT_TARGETS, "article", "dmca"] as const;

export const resolveReportsSchema = z
  .object({
    targetType: z.enum(RESOLVE_TARGETS),
    targetId: z.string().trim().min(1).max(200),
    outcome: z.enum(["actioned", "dismissed"]),
    /** Also remove the reported thread, reply or clip (outcome must be "actioned"). */
    remove: z.boolean().optional().default(false),
    reason: reason.optional().transform((value) => value || null),
  })
  .refine((input) => !input.remove || input.outcome === "actioned", { message: "Removing means actioned." })
  .refine((input) => !input.remove || ["thread", "post", "clip"].includes(input.targetType), {
    message: "Only threads, replies and clips can be removed here.",
  });
export type ResolveReportsInput = z.input<typeof resolveReportsSchema>;

/** Ban lengths offered in the ban dialog. */
export const BAN_DURATIONS = [
  { value: "1d", label: "1 day", days: 1 },
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "perm", label: "Permanent", days: null },
] as const;
export type BanDuration = (typeof BAN_DURATIONS)[number]["value"];

export const banSchema = z.object({
  userId: uuidSchema,
  duration: z.enum(BAN_DURATIONS.map((option) => option.value) as [BanDuration, ...BanDuration[]]),
  reason: z.string().trim().min(3, "Say why (the member sees it).").max(500, "Keep the reason under 500 characters."),
});

/** When a ban of this length ends; null = permanent. */
export function banUntil(duration: BanDuration, now: Date = new Date()): string | null {
  const days = BAN_DURATIONS.find((option) => option.value === duration)?.days ?? null;
  return days === null ? null : new Date(now.getTime() + days * 86_400_000).toISOString();
}

export const unbanSchema = z.object({
  userId: uuidSchema,
  reason: reason.optional().transform((value) => value || null),
});

export const roleChangeSchema = z.object({ userId: uuidSchema, role: z.enum(["user", "mod", "admin"]) });

export const flagsInputSchema = z.object({
  FEATURE_ONLINE: z.boolean(),
  FEATURE_ADS: z.boolean(),
  FEATURE_ASK_ANON: z.boolean(),
  MAINTENANCE_MODE: z.boolean(),
  SHADOW_HOLD_NEW_USERS: z.boolean(),
});

// ─── Queue URLs ─────────────────────────────────────────────────────────────
export const MODERATION_TABS = ["held", "reports", "actions"] as const;
export type ModerationTab = (typeof MODERATION_TABS)[number];
export const ACTION_FILTERS = ["all", "human", "ai"] as const;
export type ActionFilter = (typeof ACTION_FILTERS)[number];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseModerationParams(params: Record<string, string | string[] | undefined>): {
  tab: ModerationTab;
  filter: ActionFilter;
} {
  const tab = first(params.tab);
  const filter = first(params.who);
  return {
    tab: (MODERATION_TABS as readonly string[]).includes(tab ?? "") ? (tab as ModerationTab) : "held",
    filter: (ACTION_FILTERS as readonly string[]).includes(filter ?? "") ? (filter as ActionFilter) : "all",
  };
}

/**
 * Turns a user search box value into a safe ilike pattern piece: lowercase letters, digits,
 * underscores and spaces only (usernames are [a-z0-9_]), so PostgREST filter syntax can't be injected.
 */
export function userSearchTerm(value: string | string[] | undefined): string {
  return (first(value) ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}
