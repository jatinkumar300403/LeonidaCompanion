import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return buildMetadata({ title: `@${decodeURIComponent(username)}`, path: routes.user(username), noindex: true });
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  return (
    <StubPage
      eyebrow="Profile"
      title={`@${decodeURIComponent(username)}`}
      icon={UserRound}
      emptyTitle="Profiles arrive with accounts"
      emptyDescription="Accounts open with the forum at launch."
      links={[{ href: "/forum", label: "Visit the forum", primary: true }]}
    />
  );
}
