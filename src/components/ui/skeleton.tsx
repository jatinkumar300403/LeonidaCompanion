import { cn } from "cn";

/** Loading placeholder. The pulse only runs when the user hasn't asked for reduced motion. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-md bg-surface-2 motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
