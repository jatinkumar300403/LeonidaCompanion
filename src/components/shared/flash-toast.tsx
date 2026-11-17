"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { FLASH_COOKIE, flashMessage } from "@/lib/flash";

/** Shows a flash message left by a Server Action (see src/lib/flash.ts) once, after any navigation. */
export function FlashToast() {
  const pathname = usePathname();
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${FLASH_COOKIE}=([^;]*)`));
    if (!match) return;
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    const message = flashMessage(decodeURIComponent(match[1] ?? ""));
    if (message) toast.success(message);
  }, [pathname]);
  return null;
}
