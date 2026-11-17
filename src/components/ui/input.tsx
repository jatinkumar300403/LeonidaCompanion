import * as React from "react";
import { cn } from "cn";

/** 10px radius; the border uses --input (≥ 3:1 against every surface, WCAG 1.4.11). */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-base text-foreground transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
