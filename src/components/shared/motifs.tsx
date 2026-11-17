import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Large original sunset disc (sun over water) for hero areas, decorative only. Pairs with
 * PalmSilhouette in front of it. Same visual language as the logo mark, no lettering.
 */
export function SunsetDisc({ className }: { className?: string }) {
  const id = useId();
  const gradientId = `${id}-sun`;
  const maskId = `${id}-water`;
  const stripes = [0, 1, 2, 3, 4, 5];

  return (
    <svg viewBox="0 0 400 400" className={cn("pointer-events-none", className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB35C" />
          <stop offset="0.5" stopColor="#FF6A6A" />
          <stop offset="1" stopColor="#FF3D8B" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="400" height="400" fill="#fff" />
          {stripes.map((i) => (
            <rect key={i} x="0" y={226 + i * 29} width="400" height={5 + i * 3} fill="#000" />
          ))}
        </mask>
      </defs>
      <circle cx="200" cy="200" r="190" fill={`url(#${gradientId})`} mask={`url(#${maskId})`} />
    </svg>
  );
}

/**
 * Original palm silhouette (SPEC §2 motif), drawn for this site. Used sparingly at low opacity;
 * it inherits `currentColor`, so it adapts to both themes.
 */
export function PalmSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 420" className={cn("pointer-events-none", className)} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d="M130 420c-2-62-6-128-15-190-6-42-15-82-30-118l8-3c16 37 26 78 32 120 9 63 13 129 15 191z" />
        <path d="M88 108c-30-20-66-22-96 2 30-8 58-6 84 9z" />
        <path d="M88 108c-18-31-48-46-82-40 30 6 54 21 72 46z" />
        <path d="M90 106c-2-36 14-64 44-80-20 24-30 50-32 82z" />
        <path d="M92 106c24-26 58-34 92-20-32 0-60 9-84 30z" />
        <path d="M92 110c34-6 66 6 86 34-28-16-56-22-86-24z" />
        <path d="M90 112c10 30 6 60-12 86 6-28 6-56 0-82z" />
        <path d="M86 112c-24 18-36 44-34 74-10-30-2-58 22-80z" />
      </g>
    </svg>
  );
}

/** Soft dusk glows used behind hero areas. */
export function DuskGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_90%_-10%,var(--glow-pink),transparent_70%),radial-gradient(45%_55%_at_100%_45%,var(--glow-orange),transparent_70%),radial-gradient(40%_50%_at_0%_100%,var(--glow-pink),transparent_75%)]",
        className,
      )}
    />
  );
}
