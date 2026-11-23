import { z } from "zod";

/**
 * Content-removal (DMCA) requests (SPEC §14, D-098). Anyone can send one, signed in or not. The
 * request lands in the moderators' Reports queue as a `dmca` report, so its details have to fit
 * the `reports.details` column (2000 characters) and its target the `target_id` column (200).
 */
export const REMOVAL_ROLES = ["creator", "agent", "other"] as const;
export type RemovalRole = (typeof REMOVAL_ROLES)[number];

export const REMOVAL_ROLE_LABELS: Record<RemovalRole, string> = {
  creator: "I made it (it's my clip, video or writing)",
  agent: "I act for the person or company that owns it",
  other: "Something else",
};

export const REMOVAL_LIMITS = { name: 100, email: 254, url: 500, description: 1500 } as const;

const httpUrl = z
  .string()
  .trim()
  .min(1, "Paste the address of the page.")
  .max(REMOVAL_LIMITS.url, "That address is too long.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Paste the full address, starting with https://");

export const removalRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(REMOVAL_LIMITS.name, `Keep it under ${REMOVAL_LIMITS.name} characters.`),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(REMOVAL_LIMITS.email),
  url: httpUrl,
  role: z.enum(REMOVAL_ROLES, "Say how the content relates to you."),
  description: z
    .string()
    .trim()
    .min(10, "Tell us what the content is and why it's yours.")
    .max(REMOVAL_LIMITS.description, `Keep it under ${REMOVAL_LIMITS.description} characters.`),
  statement: z.literal(true, "Please confirm the statement."),
  clipId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
});

export type RemovalRequest = z.output<typeof removalRequestSchema>;

/** Field → first message, for the form. */
export function removalFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Reads the form, treating a missing checkbox as unticked and an empty clip id as none. */
export function parseRemovalForm(formData: FormData) {
  const clip = formData.get("clipId");
  return removalRequestSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    url: formData.get("url") ?? "",
    role: formData.get("role") ?? "",
    description: formData.get("description") ?? "",
    statement: formData.get("statement") === "on" || formData.get("statement") === "true",
    clipId: typeof clip === "string" && clip.trim() ? clip : undefined,
  });
}

const TARGET_MAX = 200;
const DETAILS_MAX = 2000;

/**
 * What the report points at: `clip:<id>` when it came from a clip page, the path for a page on
 * this site (one of `siteHosts`), else the address itself, cut to fit.
 */
export function removalTargetId(request: Pick<RemovalRequest, "url" | "clipId">, siteHosts: readonly string[]): string {
  if (request.clipId) return `clip:${request.clipId}`;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const local = siteHosts.includes(host) || host === "localhost";
  const target = local ? `${url.pathname}${url.search}` || "/" : url.toString();
  return target.slice(0, TARGET_MAX);
}

/** The report's details: who is asking and why, as plain text that always fits the column. */
export function formatRemovalDetails(request: RemovalRequest): string {
  const header = [
    `Removal request from ${request.name} <${request.email}>`,
    `Relationship: ${REMOVAL_ROLE_LABELS[request.role]}`,
    `Page: ${request.url}`,
    "Statement of accuracy and good faith: confirmed",
    "",
  ].join("\n");
  const room = DETAILS_MAX - header.length;
  const body = request.description.length > room ? `${request.description.slice(0, room - 1)}…` : request.description;
  return `${header}${body}`;
}
