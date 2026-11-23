"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AccountProfile } from "@/components/layout/account-menu";
import { Button } from "@/components/ui/button";
import { loadBrowserSupabase } from "@/lib/supabase/browser";

/** Signed-in only, so signed-out visitors never download the dropdown code (D-099). */
const AccountMenu = dynamic(() => import("@/components/layout/account-menu").then((module) => module.AccountMenu), {
  ssr: false,
  loading: () => <span className="size-9 rounded-full bg-surface-2" aria-hidden="true" />,
});

type MenuProfile = AccountProfile;
type MenuState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; userId: string; profile: MenuProfile | null };

/**
 * Header account control. Auth is read in the browser, so public pages stay static/ISR: the
 * server never renders per-user HTML into the shell. The slot has a fixed width (no layout shift).
 */
export function UserMenu() {
  const [state, setState] = useState<MenuState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    // The header renders this only when Supabase is configured; the client loads after hydration.
    void loadBrowserSupabase().then((supabase) => {
      if (!supabase || !active) return;

      const load = async () => {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) {
          if (active) setState({ status: "signed-out" });
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url, role")
          .eq("id", userId)
          .maybeSingle();
        if (active) setState({ status: "signed-in", userId, profile: profile ?? null });
      };

      void load();
      // Never await Supabase calls inside the callback itself (it can deadlock the auth lock).
      const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          window.setTimeout(() => void load(), 0);
        }
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    // Fixed width fits "Sign in" or the bell + avatar, so the header never shifts.
    <div className="flex w-[5.25rem] items-center justify-end gap-1" data-testid="account-slot">
      {state.status === "signed-out" ? (
        <Button asChild variant="secondary" size="sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      ) : null}

      {state.status === "signed-in" ? <AccountMenu userId={state.userId} profile={state.profile} /> : null}
    </div>
  );
}
