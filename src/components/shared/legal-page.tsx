import Link from "next/link";
import { PageHeader } from "@/components/shared/headers";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Badge } from "@/components/ui/badge";

/**
 * Layout for the legal and policy pages (SPEC §14, D-097): the header, a visible "Last updated"
 * date with a Draft badge while the owner reviews the text, then the policy as markdown (through
 * the same sanitised renderer as everything else) and any extra content, such as a form.
 */
export function LegalPage({
  eyebrow = "Legal",
  title,
  description,
  updated,
  draft = true,
  source,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** e.g. "23 November 2026"; omitted on pages without a policy text (contact). */
  updated?: string;
  draft?: boolean;
  source?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-container max-w-3xl py-10 sm:py-14">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {updated ? (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" data-testid="legal-status">
          {draft ? (
            <Badge variant="orange" size="sm">
              Draft
            </Badge>
          ) : null}
          <span>
            Last updated {updated}.
            {draft ? (
              <>
                {" "}
                Still being reviewed by the site owner; questions go to the{" "}
                <Link href="/contact" className="underline hover:text-foreground">
                  contact page
                </Link>
                .
              </>
            ) : null}
          </span>
        </p>
      ) : null}
      {source ? <MarkdownRenderer source={source} className="mt-8" /> : null}
      {children}
    </div>
  );
}
