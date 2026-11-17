import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * Cards: 14px radius. Dark mode uses a border + inner glow, light mode a soft shadow
 * (both via --card-shadow). `accent` adds the thin dusk-gradient top border; `interactive`
 * adds the hover lift (off under prefers-reduced-motion) and a focus ring for stretched links.
 */
const cardVariants = cva(
  "group/card relative flex flex-col overflow-hidden rounded-xl border text-card-foreground [--card-spacing:--spacing(5)] data-[size=sm]:[--card-spacing:--spacing(4)]",
  {
    variants: {
      variant: {
        default: "bg-card shadow-card",
        flat: "bg-surface-2",
        ghost: "border-dashed bg-transparent",
      },
      accent: {
        true: "dusk-top",
        false: "",
      },
      interactive: {
        true: "hover-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      accent: false,
      interactive: false,
    },
  },
);

function Card({
  className,
  size = "default",
  variant,
  accent,
  interactive,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ variant, accent, interactive }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-(--card-spacing) pt-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading text-lg leading-snug font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-(--card-spacing)", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("mt-auto flex items-center border-t bg-surface-2/50 px-(--card-spacing) py-3", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, cardVariants };
