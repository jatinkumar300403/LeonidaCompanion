"use client";

import { LogOut, Settings, Shield, UserRound, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/lib/routes";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { signOutAndReload } from "@/lib/supabase/sign-out";

type MenuProfile = { username: string; display_name: string | null; avatar_url: string | null; role: string };
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
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // The header renders this only when Supabase is configured.
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;

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
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    // Fixed width fits "Sign in" or the bell + avatar, so the header never shifts.
    <div className="flex w-[5.25rem] items-center justify-end gap-1" data-testid="account-slot">
      {state.status === "signed-in" && state.profile ? <NotificationBell userId={state.userId} /> : null}
      {state.status === "signed-out" ? (
        <Button asChild variant="secondary" size="sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      ) : null}

      {state.status === "signed-in" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full"
              aria-label={state.profile ? `Account menu for @${state.profile.username}` : "Account menu"}
              data-testid="account-menu"
            >
              {state.profile ? (
                <UserAvatar
                  username={state.profile.username}
                  displayName={state.profile.display_name}
                  avatarUrl={state.profile.avatar_url}
                  className="size-9"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full border bg-surface-2">
                  <UserRound className="size-4" aria-hidden="true" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {state.profile ? (
              <>
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate font-semibold text-foreground">
                    {state.profile.display_name || `@${state.profile.username}`}
                  </span>
                  {state.profile.display_name ? (
                    <span className="block truncate text-xs text-muted-foreground">@{state.profile.username}</span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={routes.user(state.profile.username)}>
                    <UserRound aria-hidden="true" />
                    Your profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings aria-hidden="true" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {state.profile.role === "mod" || state.profile.role === "admin" ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield aria-hidden="true" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/onboarding">
                  <UserRoundPen aria-hidden="true" />
                  Finish sign-up
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signingOut}
              onSelect={() => {
                setSigningOut(true);
                void signOutAndReload("/", "signed-out");
              }}
            >
              <LogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
