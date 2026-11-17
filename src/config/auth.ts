/**
 * Account rules (SPEC §9). `supabase/seed.sql` seeds RESERVED_USERNAMES into the database; a unit
 * test keeps the two lists in step.
 */

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 280;
export const MIN_AGE = 16;

/** Usernames nobody can register: staff-sounding names, brand names and route words. */
export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "mod",
  "moderator",
  "mods",
  "staff",
  "team",
  "support",
  "help",
  "official",
  "system",
  "root",
  "owner",
  "rockstar",
  "rockstargames",
  "rockstar_games",
  "rockstarsupport",
  "taketwo",
  "take_two",
  "taketwointeractive",
  "gta",
  "gta6",
  "gtavi",
  "gta_6",
  "gta_vi",
  "anonymous",
  "deleted",
  "deleted_user",
  "null",
  "undefined",
  "ai",
  "bot",
  "api",
  "auth",
  "settings",
  "onboarding",
  "signin",
  "sign_in",
  "signup",
  "sign_up",
  "login",
  "logout",
  "register",
  "me",
  "user",
  "users",
  "forum",
  "clips",
  "tips",
  "ask",
] as const;

export const PLATFORMS = [
  { value: "ps5", label: "PS5", short: "PS5" },
  { value: "xbox", label: "Xbox Series X|S", short: "Xbox Series" },
  { value: "both", label: "Both", short: "Both" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

export function platformLabel(value: string | null | undefined): string | undefined {
  return PLATFORMS.find((platform) => platform.value === value)?.label;
}

export type Role = "user" | "mod" | "admin";

export const ROLE_LABELS: Record<Role, string> = { user: "Member", mod: "Moderator", admin: "Admin" };
