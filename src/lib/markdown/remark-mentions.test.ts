import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { remarkMentions } from "./remark-mentions";
import { sanitizeSchema } from "./sanitize-schema";

function toHtml(markdown: string): string {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      { remarkPlugins: [remarkGfm, remarkMentions], rehypePlugins: [[rehypeSanitize, sanitizeSchema]] },
      markdown,
    ),
  ).trim();
}

describe("remark-mentions", () => {
  it("links @username to the profile", () => {
    expect(toHtml("Thanks @Sam_99, and @bob!")).toBe(
      '<p>Thanks <a href="/u/sam_99" class="mention">@Sam_99</a>, and <a href="/u/bob" class="mention">@bob</a>!</p>',
    );
  });

  it("leaves emails, code, links and too-short names alone", () => {
    expect(toHtml("mail a.b@example.com")).not.toContain('class="mention"');
    expect(toHtml("`@sam` in code")).toBe("<p><code>@sam</code> in code</p>");
    expect(toHtml("[@sam](/x)")).toBe('<p><a href="/x">@sam</a></p>');
    expect(toHtml("@ab is too short")).toBe("<p>@ab is too short</p>");
  });
});
