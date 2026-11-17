/** First focusable element on every page: jumps keyboard users past the header. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only rounded-lg bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-card focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
    >
      Skip to content
    </a>
  );
}
