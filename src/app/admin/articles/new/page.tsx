import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { ArticleEditor } from "@/components/admin/article-editor";
import { QuickTipForm } from "@/components/admin/quick-tip-form";
import { PageHeader } from "@/components/shared/headers";
import { Card } from "@/components/ui/card";
import { ARTICLE_TYPE_INFO, ARTICLE_TYPES, type ArticleType } from "@/config/articles";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRole } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "New article",
    path: "/admin/articles/new",
    noindex: true,
    description: "Write an article.",
  });
}

/** New article: Quick Tip mode (?mode=quick), a type picker, or the full editor (?type=…). */
export default async function NewArticlePage({ searchParams }: PageProps<"/admin/articles/new">) {
  await requireRole("admin", "/admin/articles/new");
  const params = await searchParams;
  const typeParam = typeof params.type === "string" ? params.type : "";
  const type = (ARTICLE_TYPES as readonly string[]).includes(typeParam) ? (typeParam as ArticleType) : null;
  const quick = params.mode === "quick";

  return (
    <div className="page-container max-w-6xl py-6 sm:py-10">
      <Link
        href="/admin/articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Articles
      </Link>
      {quick ? (
        <div className="mx-auto mt-4 max-w-2xl">
          <PageHeader title="Quick tip" description="Title, a few sentences, tags. Publish." className="mb-6" />
          <QuickTipForm />
        </div>
      ) : type ? (
        <>
          <PageHeader title={`New ${ARTICLE_TYPE_INFO[type].label.toLowerCase()}`} className="mt-4 mb-6" />
          <ArticleEditor type={type} article={null} siteUrl={siteConfig.url} siteName={siteConfig.name} />
        </>
      ) : (
        <>
          <PageHeader title="New article" description="What are you writing?" className="mt-4 mb-6" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <Link href="/admin/articles/new?type=tip&mode=quick" className="block h-full">
                <Card interactive accent className="h-full p-5">
                  <p className="flex items-center gap-2 font-semibold">
                    <Lightbulb className="size-4 text-orange-text" aria-hidden="true" />
                    Quick tip
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The fast phone flow: title, a few sentences, publish.
                  </p>
                </Card>
              </Link>
            </li>
            {ARTICLE_TYPES.filter((t) => t !== "guide").map((t) => (
              <li key={t}>
                <Link href={`/admin/articles/new?type=${t}` as Route} className="block h-full">
                  <Card interactive className="h-full p-5">
                    <p className="font-semibold">{ARTICLE_TYPE_INFO[t].label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Full editor · {ARTICLE_TYPE_INFO[t].section}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
