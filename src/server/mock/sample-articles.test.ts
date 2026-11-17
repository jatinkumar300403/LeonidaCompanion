import { describe, expect, it } from "vitest";
import { ARTICLE_TYPES } from "@/config/articles";
import { isValidSlug } from "@/lib/articles/slug";
import { SAMPLE_ARTICLES } from "../../../scripts/lib/sample-articles.mjs";

describe("dev sample articles (scripts/seed-dev.ts)", () => {
  it("are 3 [SAMPLE] drafts per type, never published", () => {
    for (const type of ARTICLE_TYPES) {
      expect(SAMPLE_ARTICLES.filter((article) => article.type === type)).toHaveLength(3);
    }
    for (const article of SAMPLE_ARTICLES) {
      expect(article.title.startsWith("[SAMPLE] ")).toBe(true);
      expect(article.status).toBe("draft");
      expect(isValidSlug(article.slug)).toBe(true);
      expect(article.summary.length).toBeLessThanOrEqual(160);
    }
  });
});
