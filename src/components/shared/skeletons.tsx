import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Loading placeholders shaped like the real cards, so nothing shifts when content arrives. */

export function TipCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-5", className)}>
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-4 w-28" />
    </div>
  );
}

export function FeatureCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-5", className)}>
      <Skeleton className="size-11 rounded-lg" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

export function FactCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-5", className)}>
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-2 h-3.5 w-32" />
    </div>
  );
}

export function ThreadRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-4 px-4 py-4", className)}>
      <Skeleton className="h-12 w-11 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-4/5" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </div>
  );
}

export function ClipCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border bg-card", className)}>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
