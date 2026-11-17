"use client";

import { Bell, Info, Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ThemeSwitcher, ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Interactive pieces of the /admin/ui showcase (overlays need client state). */
export function OverlayDemos() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
            <DialogDescription>Sample dialog. Phase 4 adds the real report reasons from SPEC §5.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Dialogs trap focus and close with Escape.</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Send report</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">Open side sheet</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Side sheet</SheetTitle>
            <SheetDescription>Used for filters and menus on larger screens.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">Open bottom sheet</Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Bottom sheet</SheetTitle>
            <SheetDescription>The mobile “More” menu uses this.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <ThemeSwitcher />
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Settings aria-hidden="true" />
            Dropdown
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>Signed in as sample</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More info">
            <Info aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Tooltips appear on hover and focus</TooltipContent>
      </Tooltip>

      <Button variant="outline" onClick={() => toast("Saved as draft")}>
        Toast
      </Button>
      <Button variant="outline" onClick={() => toast.success("Tip published")}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => toast.error("Couldn't publish. Try again.")}>
        Error toast
      </Button>

      <ThemeToggle />
    </div>
  );
}

export function AvatarDemos() {
  return (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>LA</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback className="bg-dusk font-semibold text-on-accent">SP</AvatarFallback>
      </Avatar>
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell aria-hidden="true" />
      </Button>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Tabs defaultValue="hot" className="max-w-xl">
      <TabsList aria-label="Sort threads">
        <TabsTrigger value="hot">Hot</TabsTrigger>
        <TabsTrigger value="new">New</TabsTrigger>
        <TabsTrigger value="top">Top this week</TabsTrigger>
        <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      {["hot", "new", "top", "unanswered"].map((value) => (
        <TabsContent key={value} value={value} className="text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden="true" />
            Panel for “{value}”. The underline slides between tabs (instant with reduced motion).
          </p>
        </TabsContent>
      ))}
    </Tabs>
  );
}
