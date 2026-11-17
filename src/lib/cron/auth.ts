import { timingSafeEqual } from "node:crypto";

/**
 * Cron routes accept `Authorization: Bearer ${CRON_SECRET}` only (D-012). Constant-time compare;
 * without a configured secret every request is refused.
 */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
