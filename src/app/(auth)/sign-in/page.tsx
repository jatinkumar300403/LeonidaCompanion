import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Sign in",
    path: "/sign-in",
    description: "Sign in to post in the forum, vote and submit clips.",
    noindex: true,
  });
}

export default function SignInPage() {
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
