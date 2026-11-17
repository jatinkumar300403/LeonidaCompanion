import { z } from "zod";
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  PLATFORMS,
  RESERVED_USERNAMES,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from "@/config/auth";

const reserved = new Set<string>(RESERVED_USERNAMES);

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function isReservedUsername(value: string): boolean {
  return reserved.has(normalizeUsername(value));
}

/** Why a username can't be used, or null when its format is fine (availability is checked separately). */
export function usernameProblem(value: string): string | null {
  const name = normalizeUsername(value);
  if (name.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `Use at most ${USERNAME_MAX} characters.`;
  if (!USERNAME_PATTERN.test(name)) return "Use only lowercase letters, numbers and underscores.";
  if (reserved.has(name)) return "That username is reserved.";
  return null;
}

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .superRefine((name, ctx) => {
    const problem = usernameProblem(name);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

const platformValues = PLATFORMS.map((platform) => platform.value) as [string, ...string[]];

/** Empty strings become null, so clearing a field clears it in the database. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters.`)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const displayNameSchema = optionalText(DISPLAY_NAME_MAX, "Display name");
export const bioSchema = optionalText(BIO_MAX, "Bio").transform((value) =>
  value === null ? null : value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n"),
);
export const platformSchema = z
  .union([z.enum(platformValues), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? (value as (typeof PLATFORMS)[number]["value"]) : null));

/** A checkbox posted from a form: "on"/"true" means ticked. */
const ticked = (message: string) =>
  z
    .union([z.literal("on"), z.literal("true"), z.literal(true)])
    .optional()
    .refine((value) => value !== undefined, { message });

export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  platform: platformSchema,
  ageConfirmed: ticked("You must be 16 or older to join."),
  termsAccepted: ticked("Please accept the Terms and the Community Guidelines."),
  next: z.string().optional(),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
  bio: bioSchema,
  platform: platformSchema,
});

export const notificationPrefsSchema = z.object({
  notifyEmailReplies: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "on" || value === "true"),
});

export const magicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254)),
  next: z.string().optional(),
});

export const deleteAccountSchema = z.object({
  confirmUsername: z.string().transform(normalizeUsername),
  removePosts: z
    .union([z.literal("on"), z.literal("true"), z.literal(true)])
    .optional()
    .transform((value) => value !== undefined),
});

/** First error message per field, for showing under form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
