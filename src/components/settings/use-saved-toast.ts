"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { SettingsState } from "@/server/profiles/actions";

/** Shows a toast each time a settings form saves. */
export function useSavedToast(state: SettingsState) {
  const savedAt = state.status === "saved" ? state.at : null;
  const message = state.status === "saved" ? state.message : null;
  useEffect(() => {
    if (savedAt && message) toast.success(message);
  }, [savedAt, message]);
}
