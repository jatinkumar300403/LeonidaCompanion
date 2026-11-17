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
