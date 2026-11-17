import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleEditor } from "@/components/admin/article-editor";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAdminArticle } from "@/server/articles/admin-queries";
import { requireRole } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Edit article",
    path: "/admin/articles",
    noindex: true,
    description: "Edit an article.",
  });
}

export default async function EditArticlePage({ params }: PageProps<"/admin/articles/[id]">) {
  const { id } = await params;
  await requireRole("admin", `/admin/articles/${id}`);
  const article = await getAdminArticle(id);
  if (!article) notFound();

  return (
    <div className="page-container max-w-6xl py-6 sm:py-10">
      <Link
        href="/admin/articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Articles
      </Link>
      <h1 className="mt-4 mb-6 line-clamp-2 text-2xl font-bold sm:text-3xl">{article.title}</h1>
      <ArticleEditor
        key={article.id}
        type={article.type}
        article={article}
        siteUrl={siteConfig.url}
        siteName={siteConfig.name}
      />
    </div>
  );
}
