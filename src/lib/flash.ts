/**
 * One-shot messages shown as a toast after a reload or redirect, without making static pages
 * dynamic: a short-lived, non-httpOnly cookie is set (by the browser or a Server Action) and
 * FlashToast shows it once and clears it.
 */
export const FLASH_COOKIE = "flash";

export const FLASH_MESSAGES = {
  "account-deleted": "Your account has been deleted.",
  "signed-out": "You're signed out.",
} as const;

export type FlashKey = keyof typeof FLASH_MESSAGES;

export function flashMessage(value: string | undefined): string | null {
  return value && value in FLASH_MESSAGES ? FLASH_MESSAGES[value as FlashKey] : null;
}
