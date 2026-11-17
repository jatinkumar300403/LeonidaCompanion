import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * Pills. Tinted variants use a 12% accent background with the accent's -text token
 * (contrast-tested in src/lib/design/contrast.test.ts; keep the /12 alpha in sync with it).
 */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-dusk font-semibold text-on-accent",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        tag: "border-border bg-surface-2 text-muted-foreground",
        pink: "border-pink/30 bg-pink/12 text-pink-text",
        orange: "border-orange/30 bg-orange/12 text-orange-text",
        teal: "border-teal/30 bg-teal/12 text-teal-text",
        violet: "border-violet/30 bg-violet/12 text-violet-text",
        destructive: "border-destructive/30 bg-destructive/12 text-destructive",
      },
      size: {
        default: "",
        sm: "h-5 px-2 text-[0.6875rem] [&>svg]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
