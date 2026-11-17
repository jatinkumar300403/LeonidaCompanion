import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { ConfirmForm } from "@/components/newsletter/confirm-form";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Confirm your email",
  path: "/newsletter/confirm",
  noindex: true,
  description: "Confirm your newsletter or waitlist sign-up.",
});

/** Double opt-in landing page (SPEC §9). The token stays in the form; nothing happens on GET. */
export default async function NewsletterConfirmPage({ searchParams }: PageProps<"/newsletter/confirm">) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" && /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null;

  return (
    <div className="page-container max-w-2xl py-10 sm:py-14">
      {token ? (
        <>
          <PageHeader
            eyebrow="Newsletter"
            title="Confirm your email"
            description="One click and you're subscribed. You can unsubscribe from any email."
          />
          <div className="mt-8">
            <ConfirmForm token={token} />
          </div>
        </>
      ) : (
        <EmptyState
          as="h1"
          icon={MailCheck}
          title="This confirmation link isn't complete"
          description="Open the link from the email again, or sign up once more for a fresh one."
        />
      )}
    </div>
  );
}
