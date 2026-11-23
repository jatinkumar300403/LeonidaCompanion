import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SkipLink } from "@/components/layout/skip-link";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { FlashToast } from "@/components/shared/flash-toast";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import { RSS_ALTERNATE } from "@/lib/seo/metadata";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} – ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { types: RSS_ALTERNATE },
  appleWebApp: { capable: true, title: siteConfig.shortName, statusBarStyle: "black-translucent" },
  openGraph: {
    siteName: siteConfig.name,
    type: "website",
    locale: siteConfig.locale,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
  ],
  colorScheme: "dark light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <SkipLink />
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
            <FlashToast />
          </TooltipProvider>
        </ThemeProvider>
        {/* The service worker only runs in production builds, so dev and E2E never cache (D-095). */}
        <ServiceWorker />
        {/* Vercel Web Analytics exists only on Vercel; elsewhere its script would 404 (D-094). */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
