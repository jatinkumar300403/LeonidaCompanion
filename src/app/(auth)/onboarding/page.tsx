import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { integrations } from "@/env";
import { safeNextPath, safeNextRoute } from "@/lib/auth/redirect";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Finish signing up",
    path: "/onboarding",
    description: "Choose a username to finish creating your account.",
    noindex: true,
  });
}

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  if (!integrations.supabase) notFound();
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const session = await requireUser(`/onboarding${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`, {
    allowIncomplete: true,
  });
  if (session.profile) redirect(safeNextRoute(next));

  return (
    <AuthCard
      eyebrow="Almost there"
      title="Choose your username"
      description={
        session.email ? (
          <>
            Signed in as <span className="font-medium text-foreground">{session.email}</span>.
          </>
        ) : undefined
      }
    >
      <OnboardingForm next={next} />
    </AuthCard>
  );
}
