import Markdown, { type Components, type Options } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { ClipEmbed } from "@/components/clips/clip-embed";
import { InlineSpoiler, SpoilerBlock } from "@/components/shared/spoiler";
import { remarkCallouts } from "@/lib/markdown/remark-callouts";
import { remarkCitations } from "@/lib/markdown/remark-citations";
import { remarkMentions } from "@/lib/markdown/remark-mentions";
import { remarkSpoiler } from "@/lib/markdown/remark-spoiler";
import { remarkYoutube, YOUTUBE_ID } from "@/lib/markdown/remark-youtube";
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
    const youtube = node?.properties?.dataYoutube;
    if (typeof youtube === "string" && YOUTUBE_ID.test(youtube)) return <YoutubeEmbed id={youtube} />;
    return <div {...props} />;
  },
  a({ node, href, ...props }) {
    void node;
    const external = typeof href === "string" && /^https?:\/\//i.test(href);
    return <a href={href} rel={external ? "noopener noreferrer nofollow ugc" : undefined} {...props} />;
  },
};

/** `::youtube[id]` in an article: the click-to-load facade, nothing from YouTube until play (rule 1). */
function YoutubeEmbed({ id }: { id: string }) {
  return (
    <ClipEmbed
      className="my-6"
      parentHosts={[]}
      clip={{
        id: 0,
        platform: "youtube",
        embedId: id,
        url: `https://www.youtube.com/watch?v=${id}`,
        title: "Embedded YouTube video",
        creatorName: "YouTube",
        creatorUrl: "https://www.youtube.com/",
        durationSec: null,
        thumbnailUrl: null,
        category: "other",
        score: 0,
        orientation: "landscape",
      }}
    />
  );
}

export function MarkdownRenderer({
  source,
  size = "lg",
  citations = 0,
  youtube = false,
  mentions = false,
  className,
}: {
  source: string;
  /** "lg": 18px article body. "sm": 16px for posts, cards and answers. */
  size?: "lg" | "sm";
  /** Number of sources available: turns [1]…[n] into citation chips. 0 = off. */
  citations?: number;
  /** Articles only: `::youtube[id]` lines become click-to-load embeds (SPEC §4). */
  youtube?: boolean;
  /** Forum posts: `@username` links to the profile (SPEC §5). */
  mentions?: boolean;
  className?: string;
}) {
  const remarkPlugins: NonNullable<Options["remarkPlugins"]> = [remarkGfm, remarkCallouts, remarkSpoiler];
  if (youtube) remarkPlugins.push(remarkYoutube);
  if (mentions) remarkPlugins.push(remarkMentions);
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
