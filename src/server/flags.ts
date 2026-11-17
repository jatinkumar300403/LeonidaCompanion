import "server-only";

/** Feature flags (SPEC §10). Stored in site_settings under the key `flags` (D-018). */
export type Flags = {
  FEATURE_ONLINE: boolean;
  FEATURE_ADS: boolean;
  FEATURE_ASK_ANON: boolean;
  MAINTENANCE_MODE: boolean;
};

export const DEFAULT_FLAGS: Flags = {
  FEATURE_ONLINE: false,
  FEATURE_ADS: false,
  FEATURE_ASK_ANON: false,
  MAINTENANCE_MODE: false,
};

/**
 * Phase 1 has no database yet, so every flag is at its default (off).
 * Phase 3 reads site_settings through a cached getter here; callers don't change.
 */
export async function getFlags(): Promise<Flags> {
  return DEFAULT_FLAGS;
}
