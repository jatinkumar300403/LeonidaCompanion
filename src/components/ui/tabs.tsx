"use client";

import * as React from "react";
import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";

/**
 * Underline tabs with a sliding dusk indicator (SPEC §2). The indicator is measured from the
 * active trigger and moved with a CSS transition: no animation library (D-029), and the global
 * reduced-motion rule turns the slide off.
 */

function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function useActiveIndicator(listRef: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = React.useState<{ left: number; width: number } | null>(null);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]');
      setBox(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };

    measure();
    const mutations = new MutationObserver(measure);
    mutations.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] });
    const resize = new ResizeObserver(measure);
    resize.observe(list);
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, [listRef]);

  return box;
}

function TabsList({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const box = useActiveIndicator(listRef);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "relative no-scrollbar flex w-full items-stretch gap-1 overflow-x-auto border-b text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-dusk transition-[transform,width] duration-200 ease-out"
        style={box ? { width: box.width, transform: `translateX(${box.left}px)` } : { width: 0, opacity: 0 }}
      />
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-offset-[-2px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 text-sm", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
