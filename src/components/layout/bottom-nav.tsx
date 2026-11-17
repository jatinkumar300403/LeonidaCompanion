"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Ellipsis } from "lucide-react";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/layout/theme-toggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { bottomTabs, isActivePath, moreNav } from "@/config/nav";
import { cn } from "@/lib/utils";

const tabClass =
  "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors focus-visible:outline-offset-[-3px]";

/** Mobile/tablet bottom tab bar (below `lg`): Home · Tips · Ask · Forum · Clips · More. */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreNav.some((item) => isActivePath(pathname, item.href));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/80 lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-6">
        {bottomTabs.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <ActiveBar active={active} />
                <Icon className={cn("size-[1.375rem]", active && "text-pink-text")} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              className={cn(
                tabClass,
                "w-full",
                moreActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ActiveBar active={moreActive} />
              <Ellipsis className={cn("size-[1.375rem]", moreActive && "text-pink-text")} aria-hidden="true" />
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="gap-0">
              <SheetHeader className="pb-2">
                <SheetTitle className="font-display text-lg font-semibold">More</SheetTitle>
                <SheetDescription>More sections and your theme.</SheetDescription>
              </SheetHeader>
              <ul className="px-2">
                {moreNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <SheetClose asChild>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className="flex h-12 items-center gap-3 rounded-lg px-3 text-base font-medium hover:bg-accent aria-[current=page]:bg-accent"
                        >
                          <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge ? (
                            <span className="rounded-full border border-violet/30 bg-violet/12 px-2 text-xs leading-5 font-semibold text-violet-text">
                              {item.badge}
                            </span>
                          ) : null}
                          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t px-5 pt-4 pb-6">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Theme</p>
                <ThemeSwitcher />
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

function ActiveBar({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-dusk transition-opacity",
        active ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
