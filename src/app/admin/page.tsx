import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Admin", path: "/admin", noindex: true, description: "Site administration." });
}

export default function AdminPage() {
  return (
    <StubPage
      eyebrow="Admin"
      title="Dashboard"
      description="Content, moderation, clips and settings arrive in Phases 3–8."
      icon={LayoutDashboard}
      emptyTitle="Nothing to manage yet"
      emptyDescription="The UI showcase lists every component in every state for visual QA."
      links={[{ href: "/admin/ui", label: "Open the UI showcase", primary: true }]}
    />
  );
}
