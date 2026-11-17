import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Notice } from "@/components/shared/form-bits";
import { StubPage } from "@/components/shared/stub-page";
import { integrations } from "@/env";
import { onboardingPath, safeNextPath, safeNextRoute } from "@/lib/auth/redirect";
import { buildMetadata } from "@/lib/seo/metadata";
import { getEnabledProviders } from "@/server/auth/providers";
import { getSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Sign in",
    path: "/sign-in",
    description: "Sign in to post in the forum, vote and submit clips.",
    noindex: true,
  });
}

const ERRORS: Record<string, { title: string; body: string }> = {
  link: {
    title: "That sign-in link didn't work",
    body: "It may have expired or already been used. Request a new one below.",
  },
  provider: { title: "That sign-in option isn't available", body: "Use your email address instead." },
  unavailable: { title: "Sign-in isn't available yet", body: "Please try again later." },
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  if (!integrations.supabase) {
    return (
      <StubPage
        eyebrow="Account"
        title="Sign in"
        description="Sign in to post in the forum, vote and submit clips."
        icon={LogIn}
        emptyTitle="Sign-in opens soon"
        emptyDescription="Accounts open with the forum at launch. Everything else on the site works without one."
        links={[
          { href: "/", label: "Go home", primary: true },
          { href: "/ask", label: "Ask AI" },
        ]}
      />
    );
  }

  const session = await getSession();
  if (session) redirect(session.profile ? safeNextRoute(next) : onboardingPath(next));

  const providers = await getEnabledProviders();
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <AuthCard
      eyebrow="Account"
      title="Sign in or join"
      description="One account to post in the forum, vote, submit clips and save your settings."
    >
      {error ? (
        <Notice tone="error" title={error.title} className="mb-6">
          {error.body}
        </Notice>
      ) : null}
      <SignInForm next={next} providers={providers} />
      <p className="mt-6 text-xs text-muted-foreground">
        New here? Your account is created when you open the link. You choose a username next.
      </p>
    </AuthCard>
  );
}
