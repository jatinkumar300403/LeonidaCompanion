import type { Metadata } from "next";
import Link from "next/link";
import { Download, ExternalLink, Settings } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AvatarEditor } from "@/components/settings/avatar-editor";
import { DeleteAccount } from "@/components/settings/delete-account";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { PageHeader } from "@/components/shared/headers";
import { Notice } from "@/components/shared/form-bits";
import { StubPage } from "@/components/shared/stub-page";
import { Button } from "@/components/ui/button";
import { integrations } from "@/env";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Settings",
    path: "/settings",
    description: "Your profile, notifications, data export and account deletion.",
    noindex: true,
  });
}

function SettingsSection({
  id,
  title,
  description,
  children,
  tone = "default",
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      aria-labelledby={id}
      className={
        tone === "danger"
          ? "rounded-[14px] border border-destructive/40 bg-surface p-5 sm:p-6"
          : "rounded-[14px] border bg-surface p-5 sm:p-6"
      }
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  if (!integrations.supabase) {
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

  const { profile, email } = await requireUser("/settings");

  return (
    <div className="page-container max-w-3xl py-8 sm:py-12">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, notifications and data."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href={routes.user(profile.username)}>
              <ExternalLink aria-hidden="true" />
              View your profile
            </Link>
          </Button>
        }
      />

      {profile.banned ? (
        <Notice tone="error" title="Your account is suspended" className="mt-6">
          {profile.bannedUntil
            ? `You can't post or change your profile until ${new Date(profile.bannedUntil).toUTCString()}.`
            : "You can't post or change your profile. You can still export or delete your data."}
        </Notice>
      ) : null}

      <div className="mt-8 space-y-6">
        <SettingsSection id="profile" title="Profile" description={`Public at /u/${profile.username}.`}>
          <div className="space-y-8">
            <AvatarEditor username={profile.username} displayName={profile.displayName} avatarUrl={profile.avatarUrl} />
            <ProfileForm displayName={profile.displayName} bio={profile.bio} platform={profile.platform} />
          </div>
        </SettingsSection>

        <SettingsSection id="notifications" title="Notifications">
          <NotificationsForm notifyEmailReplies={profile.notifyEmailReplies} />
        </SettingsSection>

        <SettingsSection
          id="data"
          title="Your data"
          description="Download your profile, threads, replies, votes, clips and Ask AI questions as a JSON file."
        >
          <Button asChild variant="secondary">
            <a href="/api/me/export" download>
              <Download aria-hidden="true" />
              Export my data
            </a>
          </Button>
        </SettingsSection>

        <SettingsSection id="account" title="Account" description={email ? `Signed in as ${email}.` : undefined}>
          <SignOutButton />
        </SettingsSection>

        <SettingsSection
          id="danger"
          title="Delete account"
          description="Permanently delete your account and personal data."
          tone="danger"
        >
          <DeleteAccount username={profile.username} />
        </SettingsSection>
      </div>
    </div>
  );
}
