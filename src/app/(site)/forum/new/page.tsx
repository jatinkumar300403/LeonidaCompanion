import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { Notice } from "@/components/shared/form-bits";
import { PageHeader } from "@/components/shared/headers";
import { canPostLinks, isCategoryReadOnly, isNewAccount, isStaff } from "@/lib/forum/rules";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth/session";
import { getFlags } from "@/server/flags";
import { getCategories } from "@/server/forum/queries";

/** /forum/new (SPEC §1, §5): signed-in members only; noindex (SPEC §13). */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Start a thread",
    path: "/forum/new",
    description: "Start a new thread in the GTA 6 help forum.",
    noindex: true,
  });
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewThreadPage({ searchParams }: PageProps<"/forum/new">) {
  const params = await searchParams;
  const title = first(params.title) ?? "";
  const category = first(params.category) ?? null;
  const next = `/forum/new${category || title ? `?${new URLSearchParams({ ...(category ? { category } : {}), ...(title ? { title } : {}) })}` : ""}`;
  const session = await requireUser(next);

  const [categories, flags] = await Promise.all([getCategories(), getFlags()]);
  const member = {
    role: session.profile.role,
    reputation: session.profile.reputation,
    createdAt: session.profile.createdAt,
  };
  const options = categories
    .filter((option) => isStaff(member.role) || !isCategoryReadOnly(option, flags))
    .map((option) => ({
      id: option.id,
      slug: option.slug,
      name: option.name,
      description: option.description,
      isQa: option.isQa,
      spoilersAllowed: option.spoilersAllowed,
    }));

  return (
    <div className="page-container py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/forum" className="hover:text-foreground">
              Forum
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="text-foreground">
            New thread
          </li>
        </ol>
      </nav>
      <div className="mx-auto mt-4 max-w-3xl">
        <PageHeader
          eyebrow="Help Forum"
          title="Start a thread"
          description="A clear title and a few details get the fastest answers."
        />
        <div className="mt-8">
          {session.profile.banned ? (
            <Notice tone="error" title="Your account is suspended">
              You can&apos;t start threads right now.
            </Notice>
          ) : (
            <NewThreadForm
              categories={options}
              initialCategory={category}
              initialTitle={title}
              canLink={canPostLinks(member)}
              isNewAccount={isNewAccount(member)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
