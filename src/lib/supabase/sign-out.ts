import { FLASH_COOKIE, type FlashKey } from "@/lib/flash";
import { loadBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Signs out in the browser (clears the session cookies and tells every tab), then reloads, so no
 * component keeps a stale signed-in state. The proxy drops the onboarding cookie hint on the way.
 */
export async function signOutAndReload(destination = "/", flash?: FlashKey): Promise<void> {
  if (flash) document.cookie = `${FLASH_COOKIE}=${flash}; Path=/; Max-Age=60; SameSite=Lax`;
  const supabase = await loadBrowserSupabase();
  try {
    await supabase?.auth.signOut({ scope: "local" });
  } finally {
    window.location.assign(destination);
  }
}
