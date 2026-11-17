import type { Route } from "next";
import {
  BadgeCheck,
  BookOpen,
  Clapperboard,
  Globe,
  House,
  Lightbulb,
  MessagesSquare,
  Rocket,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** `href` is a typed Route (typedRoutes), so a nav entry can never point at a missing page. */
export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Small pill after the label, e.g. "Soon" for Online until FEATURE_ONLINE is on. */
  badge?: string;
};

const tips: NavItem = { href: "/tips", label: "Tips", icon: Lightbulb };
const features: NavItem = { href: "/features", label: "Features", icon: BookOpen };
const facts: NavItem = { href: "/facts", label: "Facts", icon: BadgeCheck };
const forum: NavItem = { href: "/forum", label: "Forum", icon: MessagesSquare };
const clips: NavItem = { href: "/clips", label: "Clips", icon: Clapperboard };
const ask: NavItem = { href: "/ask", label: "Ask AI", icon: Sparkles };
const online: NavItem = { href: "/online", label: "Online", icon: Globe, badge: "Soon" };
const launch: NavItem = { href: "/launch", label: "Launch Hub", icon: Rocket };
const settings: NavItem = { href: "/settings", label: "Settings", icon: Settings };

/** Desktop header (SPEC §1): Tips · Features · Facts · Forum · Clips · Ask AI · Online. */
export const mainNav: NavItem[] = [tips, features, facts, forum, clips, ask, online];

/** Mobile bottom tab bar: Home · Tips · Ask · Forum · Clips (a "More" button follows). */
export const bottomTabs: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  tips,
  { ...ask, label: "Ask" },
  forum,
  clips,
];

/** Mobile "More" sheet: Features · Facts · Launch · Online · Settings. */
export const moreNav: NavItem[] = [features, facts, launch, online, settings];

export type FooterLink = { href: Route; label: string };

export const footerNav: { title: string; links: FooterLink[] }[] = [
  {
    title: "Guide",
    links: [
      { href: "/launch", label: "Launch Hub" },
      { href: "/tips", label: "Tips & Tricks" },
      { href: "/features", label: "Features Explained" },
      { href: "/facts", label: "Facts" },
      { href: "/online", label: "Online" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/forum", label: "Help Forum" },
      { href: "/clips", label: "Clips" },
      { href: "/ask", label: "Ask AI" },
      { href: "/community-guidelines", label: "Community Guidelines" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/dmca", label: "Content removal" },
      { href: "/credits", label: "Credits" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

/** Shown in the footer only when NEXT_PUBLIC_SHOW_IMPRESSUM=true. */
export const impressumLink: FooterLink = { href: "/impressum", label: "Impressum" };

/** Active-state rule shared by the header and the bottom bar. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
