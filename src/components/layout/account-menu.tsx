"use client";

import { LogOut, Settings, Shield, UserRound, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/lib/routes";
import { signOutAndReload } from "@/lib/supabase/sign-out";

export type AccountProfile = { username: string; display_name: string | null; avatar_url: string | null; role: string };

/**
 * The signed-in half of the header's account slot: the notification bell and the account menu.
 * Loaded only for signed-in visitors (next/dynamic in UserMenu), so everyone else never downloads
 * the dropdown code (D-099).
 */
export function AccountMenu({ userId, profile }: { userId: string; profile: AccountProfile | null }) {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <>
      {profile ? <NotificationBell userId={userId} /> : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full"
            aria-label={profile ? `Account menu for @${profile.username}` : "Account menu"}
            data-testid="account-menu"
          >
            {profile ? (
              <UserAvatar
                username={profile.username}
                displayName={profile.display_name}
                avatarUrl={profile.avatar_url}
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
          {profile ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-semibold text-foreground">
                  {profile.display_name ? <bdi>{profile.display_name}</bdi> : `@${profile.username}`}
                </span>
                {profile.display_name ? (
                  <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={routes.user(profile.username)}>
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
              {profile.role === "mod" || profile.role === "admin" ? (
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
    </>
  );
}
