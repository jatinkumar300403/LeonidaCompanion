"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes (D-006): sets `light` or `dark` on <html> before first paint, follows the system
 * on a first visit and remembers the choice. With no class (no JS) the dark tokens apply.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
