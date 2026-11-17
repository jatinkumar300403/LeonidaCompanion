import Markdown, { type Components, type Options } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { InlineSpoiler, SpoilerBlock } from "@/components/shared/spoiler";
import { remarkCallouts } from "@/lib/markdown/remark-callouts";
import { remarkCitations } from "@/lib/markdown/remark-citations";
import { remarkSpoiler } from "@/lib/markdown/remark-spoiler";
import { sanitizeSchema } from "@/lib/markdown/sanitize-schema";
import { cn } from "@/lib/utils";

/**
 * The one markdown renderer for articles, forum posts and AI answers (SPEC §2/§4).
 * Pipeline: remark-gfm → callouts → ||spoilers|| → [n] citations (optional) →
 * rehype-sanitize (GitHub schema + our classes) → rehype-slug. Raw HTML is never rendered.
 * Works in Server Components (zero client JS for the text) and in Client Components.
 */

type HeadingTag = "h2" | "h3" | "h4";

function heading(Tag: HeadingTag): NonNullable<Components["h2"]> {
  return function Heading({ id, children }) {
    if (!id) return <Tag>{children}</Tag>;
    return (
      <Tag id={id}>
        <a href={`#${id}`} className="heading-anchor">
          {children}
        </a>
      </Tag>
    );
  };
}

const components: Components = {
  // The page owns the only <h1>; a markdown "# Title" renders as a section heading.
  h1: heading("h2"),
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  span({ node, ...props }) {
    if (node?.properties?.dataSpoiler === "inline") return <InlineSpoiler>{props.children}</InlineSpoiler>;
    return <span {...props} />;
  },
  div({ node, ...props }) {
    if (node?.properties?.dataSpoiler === "block") return <SpoilerBlock>{props.children}</SpoilerBlock>;
    return <div {...props} />;
  },
  a({ node, href, ...props }) {
    void node;
    const external = typeof href === "string" && /^https?:\/\//i.test(href);
    return <a href={href} rel={external ? "noopener noreferrer nofollow ugc" : undefined} {...props} />;
  },
};

export function MarkdownRenderer({
  source,
  size = "lg",
  citations = 0,
  className,
}: {
  source: string;
  /** "lg": 18px article body. "sm": 16px for posts, cards and answers. */
  size?: "lg" | "sm";
  /** Number of sources available: turns [1]…[n] into citation chips. 0 = off. */
  citations?: number;
  className?: string;
}) {
  const remarkPlugins: NonNullable<Options["remarkPlugins"]> = [remarkGfm, remarkCallouts, remarkSpoiler];
  if (citations > 0) remarkPlugins.push([remarkCitations, { max: citations }]);

  return (
    <div className={cn("markdown", className)} data-size={size}>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeSlug]}
        components={components}
      >
        {source}
      </Markdown>
    </div>
  );
}
