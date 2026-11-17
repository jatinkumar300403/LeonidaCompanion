import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, Clock, MessagesSquare, Sparkles } from "lucide-react";
import { ArticleCard } from "@/components/articles/article-card";
import { HelpfulVote } from "@/components/articles/helpful-vote";
import { SourcesBox } from "@/components/articles/sources-box";
import { StatusBadge } from "@/components/articles/status-badge";
import { TocDesktop, TocMobile } from "@/components/articles/toc";
import { JsonLd } from "@/components/shared/json-ld";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { RelativeTime } from "@/components/shared/relative-time";
import { SpoilerBlock } from "@/components/shared/spoiler";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ARTICLE_TYPE_INFO, articlePath } from "@/config/articles";
import { siteConfig } from "@/config/site";
import { SPOILER_LEVELS, tagLabel } from "@/config/tags";
import { extractFaq, extractToc, plainText, readTimeMinutes } from "@/lib/articles/content";
import { routes } from "@/lib/routes";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { ogImagePath } from "@/lib/seo/og";
import type { Article, ArticleListItem } from "@/server/articles/model";

/**
 * The article template (SPEC §4): breadcrumb · title · meta row · lede · TOC · body · sources ·
 * "Was this helpful?" · related · Ask AI / forum CTAs, plus Article (+FAQPage) and BreadcrumbList
 * JSON-LD. Story-spoiler articles (spoiler_level "major") keep the body behind a spoiler gate.
 */
export function ArticlePage({ article, related }: { article: Article; related: ArticleListItem[] }) {
  const info = ARTICLE_TYPE_INFO[article.type];
  const indexPath = info.index ?? "/";
  const path = articlePath(article.type, article.slug) ?? "/";
  const absolute = (p: string) => new URL(p, siteConfig.url).toString();
  const toc = extractToc(article.bodyMd);
  const faq = extractFaq(article.bodyMd);
  const updated = article.updatedAt;
  // Quick tips derive their summary from the body: don't print the same sentences twice.
  const showLede = Boolean(article.summary) && !plainText(article.bodyMd).startsWith(article.summary.replace(/…$/, ""));

  const body = <MarkdownRenderer source={article.bodyMd} youtube />;

  return (
    <article className="page-container py-8 sm:py-12">
      <JsonLd
        data={articleJsonLd({
          title: article.title,
          description: article.summary,
          url: absolute(path),
          imageUrl: absolute(ogImagePath(article.title, info.section)),
          publishedAt: article.publishedAt,
          updatedAt: updated,
          siteName: siteConfig.name,
          siteUrl: siteConfig.url,
          section: info.section,
          tags: article.tags,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absolute("/") },
          { name: info.section, url: absolute(indexPath) },
          { name: article.title, url: absolute(path) },
        ])}
      />
      {faq.length > 0 ? <JsonLd data={faqJsonLd(faq)} /> : null}

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex min-w-0 items-center gap-1">
          <li className="shrink-0">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="shrink-0">
            <Link href={indexPath} className="hover:text-foreground">
              {info.section}
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="min-w-0 truncate text-foreground">
            {article.title}
          </li>
        </ol>
      </nav>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
        <div className="min-w-0">
          <header className="max-w-[68ch]">
            {article.type === "fact" && article.factStatus ? (
              <StatusBadge status={article.factStatus} withTooltip className="mb-3" />
            ) : null}
            <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{article.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <Badge variant="tag">{info.label}</Badge>
              <span>
                Updated <RelativeTime date={updated} />
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {readTimeMinutes(article.bodyMd)} min read
              </span>
              <Badge variant={article.spoilerLevel === "none" ? "teal" : "pink"}>
                {SPOILER_LEVELS[article.spoilerLevel]}
              </Badge>
            </div>
            {showLede ? <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{article.summary}</p> : null}
            {article.tags.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
                {article.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`${indexPath}?tag=${encodeURIComponent(tag)}` as Route}>
                      <Badge variant="tag" size="sm" className="hover:text-foreground">
                        {tagLabel(tag)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          {article.coverImageUrl ? (
            <div className="relative mt-6 aspect-video max-w-[68ch] overflow-hidden rounded-xl border bg-surface-2">
              <Image
                src={article.coverImageUrl}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 720px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="mt-6 max-w-[68ch]">
            <TocMobile items={toc} />
          </div>

          <div className="mt-8 max-w-[68ch]">
            {article.spoilerLevel === "major" ? (
              <SpoilerBlock label="This article has story spoilers">{body}</SpoilerBlock>
            ) : (
              body
            )}
          </div>

          <div className="mt-10 flex max-w-[68ch] flex-col gap-4">
            <SourcesBox sources={article.sources} />
            <HelpfulVote articleId={article.id} up={article.helpfulUp} down={article.helpfulDown} />
            <section aria-labelledby="stuck-heading" className="rounded-xl border border-dashed p-5">
              <h2 id="stuck-heading" className="text-base font-semibold">
                Still stuck?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Ask the AI (it cites its sources) or the community.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={routes.ask(article.title)}>
                    <Sparkles aria-hidden="true" />
                    Ask AI
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={routes.newThread(article.title)}>
                    <MessagesSquare aria-hidden="true" />
                    Ask the forum
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </div>

        <aside className="hidden lg:block">
          <TocDesktop items={toc} />
        </aside>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-14">
          <h2 id="related-heading" className="text-xl font-semibold sm:text-2xl">
            Related
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.id} className="flex">
                <ArticleCard item={item} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
