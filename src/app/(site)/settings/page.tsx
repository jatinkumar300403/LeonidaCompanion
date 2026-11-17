import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Settings",
    path: "/settings",
    description: "Your profile, notifications, data export and account deletion.",
    noindex: true,
  });
}

export default function SettingsPage() {
  return (
    <StubPage
      eyebrow="Account"
      title="Settings"
      description="Profile, notifications, data export and account deletion."
      icon={Settings}
      emptyTitle="Settings arrive with accounts"
      emptyDescription="Accounts open with the forum at launch."
      links={[{ href: "/", label: "Go home", primary: true }]}
    />
  );
}
