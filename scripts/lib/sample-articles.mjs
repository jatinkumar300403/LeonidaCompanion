/**
 * Dev-only [SAMPLE] article drafts (D-030, Prompt 3). Placeholder text only: nothing here is a
 * claim about the game. Every title starts with "[SAMPLE]" and every status is "draft", which a
 * unit test enforces (src/server/mock/sample-articles.test.ts). Used by scripts/seed-dev.ts.
 */

const TYPES = ["tip", "feature", "fact", "online", "launch", "guide"];

const TOPICS = {
  tip: [
    ["Saving before a big job", ["beginner"]],
    ["Keeping your car in one piece", ["driving", "vehicles"]],
    ["Settings worth a look on day one", ["settings", "accessibility"]],
  ],
  feature: [
    ["How a game system might work", ["beginner"]],
    ["Getting around the map", ["map"]],
    ["Money and spending", ["money"]],
  ],
  fact: [
    ["A sample confirmed fact", ["beginner"]],
    ["A sample verified fact", ["easter-eggs"]],
    ["A sample community fact", ["characters"]],
  ],
  online: [
    ["Getting started online", ["online", "beginner"]],
    ["Playing fair with a crew", ["online"]],
    ["Online settings to check", ["online", "settings"]],
  ],
  launch: [
    ["Launch day checklist", ["beginner"]],
    ["First ten things to do", ["beginner"]],
    ["Preload and download notes", ["performance"]],
  ],
  guide: [
    ["A longer walkthrough", ["missions"]],
    ["A collectibles route", ["collectibles", "map"]],
    ["A driving deep dive", ["driving"]],
  ],
};

const FACT_STATUS = ["confirmed", "verified", "community"];

function body(title) {
  return [
    `Sample body for "${title}". This is placeholder text for layout and editor testing only.`,
    "## What this covers",
    "A short paragraph that stands in for real, sourced content.",
    "> [!TIP]\n> Callouts render like this.",
    "### A sub-section",
    "- First placeholder point\n- Second placeholder point",
    "||A spoiler block to check the reveal control.||",
    "## FAQ",
    "### Is this real content?",
    "No. It's a dev-only sample draft.",
  ].join("\n\n");
}

export const SAMPLE_ARTICLES = TYPES.flatMap((type) =>
  TOPICS[type].map(([topic, tags], index) => {
    const title = `[SAMPLE] ${topic}`;
    return {
      type,
      slug: `sample-${type}-${index + 1}`,
      title,
      summary: `Sample summary for a ${type} draft. Placeholder text, not a claim about the game.`,
      body_md: body(title),
      tags,
      status: "draft",
      spoiler_level: index === 2 ? "minor" : "none",
      fact_status: type === "fact" ? FACT_STATUS[index] : null,
      sources: [
        { title: "Example source (sample)", url: "https://example.com/sample-source", accessed_at: "2026-11-18" },
      ],
    };
  }),
);
