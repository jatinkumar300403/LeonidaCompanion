import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { footerNav, impressumLink } from "@/config/nav";
import { siteConfig } from "@/config/site";
import { isNewsletterEnabled } from "@/server/newsletter/status";

/** Footer: brand + digest sign-up, section and legal links, and the rule-3 disclaimer. */
export function SiteFooter() {
  const groups = footerNav.map((group) =>
    group.title === "About" && siteConfig.showImpressum ? { ...group, links: [...group.links, impressumLink] } : group,
  );

  return (
    <footer className="border-t bg-surface/60">
      <div className="page-container grid gap-10 py-12 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-8">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            Tips, explained features, sourced facts and a help forum for GTA VI, built by fans.
          </p>
          <p className="mt-5 text-sm font-medium">The weekly digest</p>
          <p className="mt-1 text-sm text-muted-foreground">Top tips, threads and clips. One email, every Monday.</p>
          <NewsletterForm enabled={isNewsletterEnabled()} className="mt-3" />
        </div>

        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="font-display text-sm font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-dusk text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t">
        <div className="page-container flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <p data-testid="site-disclaimer" className="max-w-3xl">
            {siteConfig.disclaimer}
          </p>
          <p className="shrink-0">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
