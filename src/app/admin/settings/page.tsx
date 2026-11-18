import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { FlagsForm } from "@/components/admin/flags-form";
import { PageHeader } from "@/components/shared/headers";
import { Card } from "@/components/ui/card";
import { integrations } from "@/env";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRole } from "@/server/auth/session";
import { getFlags } from "@/server/flags";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Settings",
    path: "/admin/settings",
    noindex: true,
    description: "Feature flags and site switches.",
  });
}

/** SPEC §10 feature flags (site_settings.flags, read through the cached getFlags()). Admins only. */
export default async function AdminSettingsPage() {
  await requireRole("admin", "/admin/settings");
  const flags = await getFlags();

  return (
    <div className="page-container max-w-3xl py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Site switches. Changes apply within a few seconds and are logged in Moderation → Recent actions."
      />
      <Card className="mt-6 flex items-start gap-3 p-4">
        <Bot className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-semibold">AI pre-check: {integrations.anthropic ? "on" : "off"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {integrations.anthropic
              ? "Threads, replies, clips and bios are checked by the fast model before they go live (4 s limit)."
              : "No ANTHROPIC_API_KEY. The fallback rule holds posts from members under 20 reputation."}
          </p>
        </div>
      </Card>
      <section aria-labelledby="flags-heading" className="mt-8">
        <h2 id="flags-heading" className="text-lg font-semibold">
          Feature flags
        </h2>
        <div className="mt-3">
          <FlagsForm initial={flags} />
        </div>
      </section>
    </div>
  );
}
