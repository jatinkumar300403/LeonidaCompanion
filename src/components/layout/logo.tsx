import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * Original logo mark: a dusk sun setting into water, with a palm cut out as negative space so it
 * works on light and dark backgrounds alike. No lettering, no Roman numerals, nothing that
 * resembles Rockstar or GTA branding (CLAUDE.md rule 2). Also the source for the favicon set.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const id = useId();
  const gradientId = `${id}-sun`;
  const maskId = `${id}-cut`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF9F43" />
          <stop offset="0.55" stopColor="#FF6A6A" />
          <stop offset="1" stopColor="#FF3D8B" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="48" height="48" fill="#fff" />
          {/* water lines */}
          <rect x="0" y="28.6" width="48" height="1.6" fill="#000" />
          <rect x="0" y="32.8" width="48" height="2.1" fill="#000" />
          <rect x="0" y="37.4" width="48" height="2.6" fill="#000" />
          <rect x="0" y="42.4" width="48" height="3.2" fill="#000" />
          {/* palm: trunk and fronds */}
          <g fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round">
            <path d="M34.6 47.5C34 39.5 32.3 29.6 28.4 19.4" strokeWidth="2.6" />
            <path d="M28.4 19.2C24.6 15.6 19.3 15.4 14.6 19.4" strokeWidth="2.3" />
            <path d="M28.4 19.2C26.9 13.8 22.6 10.6 17.5 10.6" strokeWidth="2.3" />
            <path d="M28.4 19.2C29.6 13.6 33.3 10 38 9.3" strokeWidth="2.3" />
            <path d="M28.4 19.2C33.2 16.9 38.4 17.8 41.6 21.8" strokeWidth="2.3" />
          </g>
        </mask>
      </defs>
      <circle cx="24" cy="24" r="21" fill={`url(#${gradientId})`} mask={`url(#${maskId})`} />
    </svg>
  );
}

/** Mark + wordmark, linking home. The wordmark text comes from siteConfig.name. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 rounded-lg font-display font-semibold tracking-tight", className)}
    >
      <LogoMark className={compact ? "size-7" : "size-8"} />
      <span className={cn("whitespace-nowrap", compact ? "text-base" : "text-lg")}>{siteConfig.name}</span>
    </Link>
  );
}
