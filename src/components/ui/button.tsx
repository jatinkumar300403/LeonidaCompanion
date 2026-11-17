import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * Leonida Dusk buttons. The primary button sits on the dusk gradient with a dark #0A0B10 label
 * (white fails AA there, D-007). Focus uses the global solid ring from globals.css.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,filter,box-shadow,transform] duration-150 select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive motion-safe:active:not-aria-[haspopup]:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-dusk text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_6px_20px_-10px_var(--pink)] hover:brightness-105 hover:saturate-[1.1] disabled:border-border disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        outline: "border-input bg-transparent text-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent aria-expanded:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        link: "h-auto px-0 text-pink-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
