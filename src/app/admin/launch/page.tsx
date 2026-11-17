import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { LaunchFactsEditor } from "@/components/admin/launch-facts-editor";
import { PageHeader } from "@/components/shared/headers";
import { buildMetadata } from "@/lib/seo/metadata";
import { parseStoredLaunchFacts } from "@/lib/validation/launch-facts";
import { requireRole } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Launch Hub",
    path: "/admin/launch",
    noindex: true,
    description: "Edit launch facts.",
  });
}

/** Launch Hub editor (SPEC §10): site_settings.launch_facts, admin only. Reads fresh (no cache). */
export default async function AdminLaunchPage() {
  await requireRole("admin", "/admin/launch");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "launch_facts").maybeSingle();
  const facts = parseStoredLaunchFacts(data?.value);

  return (
    <div className="page-container max-w-3xl py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Launch Hub facts"
        description="Release time, platforms, editions, preload and download size. Official sources only."
        actions={
          <Link href="/launch" target="_blank" className="inline-flex items-center gap-1 link-dusk text-sm">
            View /launch
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="mt-8">
        <LaunchFactsEditor initial={facts} />
      </div>
    </div>
  );
}
