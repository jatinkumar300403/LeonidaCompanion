import { describe, expect, it } from "vitest";
import { serializeJsonLd, websiteJsonLd } from "./jsonld";
import { buildMetadata, pageTitle } from "./metadata";

describe("pageTitle", () => {
  it("follows the SPEC §13 pattern", () => {
    expect(pageTitle("How to Lose a Wanted Level", "Tips")).toBe("How to Lose a Wanted Level – GTA 6 Tips");
    expect(pageTitle("About")).toBe("About");
  });
});

describe("buildMetadata", () => {
  it("sets the canonical path and description", () => {
    const meta = buildMetadata({ title: "Tips & Tricks", path: "/tips", description: "All the tips." });
    expect(meta.title).toBe("Tips & Tricks");
    expect(meta.alternates?.canonical).toBe("/tips");
    expect(meta.description).toBe("All the tips.");
    expect(meta.robots).toBeUndefined();
  });

  it("marks noindex pages", () => {
    expect(buildMetadata({ title: "Search", path: "/search", noindex: true }).robots).toEqual({
      index: false,
      follow: true,
    });
  });
});

describe("JSON-LD", () => {
  it("describes the site with a SearchAction", () => {
    const data = websiteJsonLd({ name: "Atlas", url: "https://example.com" });
    expect(data["@type"]).toBe("WebSite");
    expect(data.potentialAction.target.urlTemplate).toBe("https://example.com/search?q={search_term_string}");
    expect(data.potentialAction["query-input"]).toBe("required name=search_term_string");
  });

  it("escapes < so the payload can't close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
