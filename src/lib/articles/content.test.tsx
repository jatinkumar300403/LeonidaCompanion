import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import {
  countSentences,
  deriveSummary,
  extractFaq,
  extractToc,
  featureIconFor,
  plainText,
  rankRelated,
  readTimeMinutes,
} from "./content";

describe("plainText and readTimeMinutes", () => {
  it("strips markdown syntax", () => {
    expect(plainText("## Title\n\n**Bold** and [a link](https://x.y) with ||spoiler||.\n\n- item")).toBe(
      "Title Bold and a link with spoiler. item",
    );
    expect(plainText("> [!TIP]\n> Save often.")).toBe("Save often.");
  });

  it("estimates at least a minute", () => {
    expect(readTimeMinutes("")).toBe(1);
    expect(readTimeMinutes("word ".repeat(660))).toBe(3);
  });
});

describe("extractToc", () => {
  it("lists H1–H3 with the exact ids rehype-slug renders", () => {
    const md = [
      "# Intro",
      "## Getting **started**",
      "### Save often",
      "#### Deep detail",
      "## Getting started",
      "```\n## not a heading\n```",
      "## Deep detail",
    ].join("\n\n");
    const toc = extractToc(md);
    expect(toc).toEqual([
      { id: "intro", text: "Intro", level: 2 },
      { id: "getting-started", text: "Getting started", level: 2 },
      { id: "save-often", text: "Save often", level: 3 },
      { id: "getting-started-1", text: "Getting started", level: 2 },
      { id: "deep-detail-1", text: "Deep detail", level: 2 },
    ]);
    const html = renderToStaticMarkup(<MarkdownRenderer source={md} />);
    for (const item of toc) expect(html).toContain(`id="${item.id}"`);
  });
});

describe("extractFaq", () => {
  it("reads ### questions and their answers under ## FAQ", () => {
    const md = [
      "Intro.",
      "## FAQ",
      "### Is it on PC?",
      "Not at launch.",
      "### Can I *pre-load*?",
      "Yes, two days early.",
      "## Other",
      "### Not a FAQ",
      "No.",
    ].join("\n\n");
    expect(extractFaq(md)).toEqual([
      { question: "Is it on PC?", answer: "Not at launch." },
      { question: "Can I pre-load?", answer: "Yes, two days early." },
    ]);
  });

  it("returns nothing without a FAQ section or answers", () => {
    expect(extractFaq("## Tips\n\n### One\n\nText")).toEqual([]);
    expect(extractFaq("## FAQ\n\n### Empty question")).toEqual([]);
  });
});

describe("Quick Tip helpers", () => {
  it("counts sentences", () => {
    expect(countSentences("")).toBe(0);
    expect(countSentences("One sentence.")).toBe(1);
    expect(countSentences("First. Second! Third?")).toBe(3);
    expect(countSentences("First. Then an unfinished one")).toBe(2);
  });

  it("derives a summary of whole sentences within 160 characters", () => {
    expect(deriveSummary("Short tip.")).toBe("Short tip.");
    const body = `${"A".repeat(100)}. ${"B".repeat(100)}.`;
    expect(deriveSummary(body)).toBe(`${"A".repeat(100)}.`);
    const oneLong = `${"word ".repeat(60)}end`;
    const summary = deriveSummary(oneLong);
    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary.endsWith("…")).toBe(true);
  });
});

describe("rankRelated", () => {
  const item = (id: string, tags: string[], publishedAt = "2026-11-19") => ({ id, tags, publishedAt });

  it("orders by shared tags, then newest, and drops the article itself", () => {
    const ranked = rankRelated(
      ["money", "beginner"],
      [
        item("self", ["money", "beginner"]),
        item("one", ["money"], "2026-11-20"),
        item("two", ["money", "beginner"]),
        item("none", ["driving"]),
        item("older", ["beginner"], "2026-11-18"),
      ],
      { excludeId: "self" },
    );
    expect(ranked.map((r) => r.id)).toEqual(["two", "one", "older"]);
  });
});

describe("featureIconFor", () => {
  it("maps tags to card icons with a compass fallback", () => {
    expect(featureIconFor(["wanted-level", "money"])).toBe("siren");
    expect(featureIconFor(["money"])).toBe("wallet");
    expect(featureIconFor(["beginner"])).toBe("compass");
  });
});
