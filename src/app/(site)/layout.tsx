import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { SiteShell } from "@/components/layout/site-shell";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteShell>
      <MaintenanceBanner />
      {children}
    </SiteShell>
  );
}
