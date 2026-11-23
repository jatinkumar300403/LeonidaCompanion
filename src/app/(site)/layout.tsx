import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { SiteShell } from "@/components/layout/site-shell";
import { InstallBanner } from "@/components/pwa/install-banner";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteShell>
      <MaintenanceBanner />
      {children}
      <InstallBanner />
    </SiteShell>
  );
}
