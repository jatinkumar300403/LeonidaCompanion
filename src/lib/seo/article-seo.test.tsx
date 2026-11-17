import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, serializeJsonLd } from "./jsonld";
import { ogImagePath, parseOgParams } from "./og";

describe("article JSON-LD", () => {
  it("builds Article with dates, image and publisher", () => {
    const data = articleJsonLd({
      title: "Save often",
      description: "Why saving matters.",
      url: "https://site.test/tips/save-often",
      imageUrl: "https://site.test/api/og?title=Save+often",
      publishedAt: "2026-11-19T00:00:00Z",
      updatedAt: "2026-11-19T01:00:00Z",
      siteName: "Site",
      siteUrl: "https://site.test",
      section: "Tips",
      tags: ["beginner"],
    });
    expect(data["@type"]).toBe("Article");
    expect(data.datePublished).toBe("2026-11-19T00:00:00Z");
    expect(data.dateModified).toBe("2026-11-19T01:00:00Z");
    expect(data.publisher.name).toBe("Site");
    expect(data.keywords).toBe("beginner");
  });

  it("builds BreadcrumbList and FAQPage", () => {
    const crumbs = breadcrumbJsonLd([
      { name: "Home", url: "https://site.test/" },
      { name: "Tips", url: "https://site.test/tips" },
    ]);
    expect(crumbs.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Tips",
      item: "https://site.test/tips",
    });
    const faq = faqJsonLd([{ question: "Q?", answer: "A." }]);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe("A.");
  });

  it("serialises without a way to close the script tag", () => {
    expect(serializeJsonLd({ text: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("OG params", () => {
  it("clamps and cleans the title and section", () => {
    const params = new URLSearchParams({ title: `Line\nbreak ${"x".repeat(200)}`, section: "Tips" });
    const parsed = parseOgParams(params);
    expect(parsed.title.startsWith("Line break")).toBe(true);
    expect(parsed.title.length).toBeLessThanOrEqual(110);
    expect(parsed.section).toBe("Tips");
    expect(parseOgParams(new URLSearchParams())).toEqual({ title: "", section: "" });
  });

  it("builds the image path", () => {
    expect(ogImagePath("Save often & win", "Tips")).toBe("/api/og?title=Save+often+%26+win&section=Tips");
  });
});

describe("::youtube directive", () => {
  const render = (source: string, youtube = true) =>
    renderToStaticMarkup(<MarkdownRenderer source={source} youtube={youtube} />);

  it("turns a line into the click-to-load facade, without loading YouTube", () => {
    const html = render("Watch this:\n\n::youtube[dQw4w9WgXcQ]\n\nThen read on.");
    expect(html).toContain("Play clip");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("::youtube");
  });

  it("ignores invalid ids, inline use, and renderers without the option", () => {
    expect(render("::youtube[bad id]")).toContain("::youtube[bad id]");
    expect(render("See ::youtube[dQw4w9WgXcQ] inline")).toContain("::youtube[dQw4w9WgXcQ]");
    expect(render("::youtube[dQw4w9WgXcQ]", false)).toContain("::youtube[dQw4w9WgXcQ]");
  });
});
