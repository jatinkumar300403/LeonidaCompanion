import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { remarkCallouts } from "./remark-callouts";
import { remarkCitations } from "./remark-citations";
import { remarkSpoiler, transformSpoilers } from "./remark-spoiler";
import { sanitizeSchema } from "./sanitize-schema";

/** Same remark/rehype chain as MarkdownRenderer, without its React component mapping. */
function toHtml(markdown: string, { citations = 0 }: { citations?: number } = {}): string {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      {
        remarkPlugins: [remarkGfm, remarkCallouts, remarkSpoiler, [remarkCitations, { max: citations }]],
        rehypePlugins: [[rehypeSanitize, sanitizeSchema]],
      },
      markdown,
    ),
  ).trim();
}

describe("remark-spoiler", () => {
  it("wraps inline spoilers", () => {
    expect(toHtml("The ending: ||everyone wins|| (really).")).toBe(
      '<p>The ending: <span data-spoiler="inline">everyone wins</span> (really).</p>',
    );
  });

  it("keeps formatting inside a spoiler", () => {
    expect(toHtml("A ||**bold** move|| here")).toBe(
      '<p>A <span data-spoiler="inline"><strong>bold</strong> move</span> here</p>',
    );
  });

  it("handles several spoilers in one paragraph", () => {
    expect(toHtml("||a|| and ||b||")).toBe(
      '<p><span data-spoiler="inline">a</span> and <span data-spoiler="inline">b</span></p>',
    );
  });

  it("promotes a paragraph that is only a spoiler to a block", () => {
    expect(toHtml("||The whole paragraph is a spoiler.||")).toBe(
      '<div data-spoiler="block">The whole paragraph is a spoiler.</div>',
    );
  });

  it("leaves unmatched delimiters and empty pairs as text", () => {
    expect(toHtml("a || b")).toBe("<p>a || b</p>");
    expect(toHtml("empty |||| pair")).toBe("<p>empty |||| pair</p>");
  });

  it("never touches code spans", () => {
    expect(toHtml("Use `a || b` here")).toBe("<p>Use <code>a || b</code> here</p>");
  });

  it("works in headings and table cells", () => {
    expect(toHtml("## Who is ||the boss||?")).toContain('<h2>Who is <span data-spoiler="inline">the boss</span>?</h2>');
    expect(toHtml("| a |\n|---|\n| x \\|\\|y\\|\\| z |")).toContain('<span data-spoiler="inline">y</span>');
  });

  it("transformSpoilers is a no-op without delimiters", () => {
    const children = [{ type: "text" as const, value: "plain" }];
    expect(transformSpoilers(children)).toBe(children);
  });
});

describe("remark-callouts", () => {
  it.each(["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"])("turns [!%s] into a callout", (type) => {
    const html = toHtml(`> [!${type}]\n> Body text.`);
    const lower = type.toLowerCase();
    expect(html).toContain(`<div class="callout callout-${lower}" role="note">`);
    expect(html).toContain('<p class="callout-title">');
    expect(html).toContain("<p>Body text.</p>");
    expect(html).not.toContain("[!");
  });

  it("accepts the marker and text on one line", () => {
    expect(toHtml("> [!TIP] Save often.")).toContain("<p>Save often.</p>");
  });

  it("leaves ordinary blockquotes alone", () => {
    expect(toHtml("> Just a quote.")).toBe("<blockquote>\n<p>Just a quote.</p>\n</blockquote>");
  });
});

describe("remark-citations", () => {
  it("turns [n] within range into chips and leaves the rest", () => {
    const html = toHtml("Fact one [1]. Fact two [2]. Not a source [9].", { citations: 2 });
    expect(html).toContain('<a href="#source-1" class="citation-chip" aria-label="Source 1">1</a>');
    expect(html).toContain('<a href="#source-2" class="citation-chip" aria-label="Source 2">2</a>');
    expect(html).toContain("[9]");
  });

  it("is inert when citations are off", () => {
    expect(toHtml("Value [1].")).toBe("<p>Value [1].</p>");
  });
});

describe("sanitizing", () => {
  it.each([
    ["<script>alert(1)</script>", "<script"],
    ['<img src=x onerror="alert(1)">', "onerror"],
    ["[click](javascript:alert(1))", "javascript:"],
    ['<a href="https://example.com" onclick="steal()">x</a>', "onclick"],
    ["<iframe src=https://evil.example></iframe>", "<iframe"],
  ])("strips %s", (payload, forbidden) => {
    expect(toHtml(payload)).not.toContain(forbidden);
  });

  it("never renders raw HTML, so look-alike markup stays inert text", () => {
    const html = toHtml('<div class="callout">x</div>');
    expect(html).not.toContain('<div class="callout"');
  });
});
