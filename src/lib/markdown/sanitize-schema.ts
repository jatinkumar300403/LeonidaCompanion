import { defaultSchema } from "rehype-sanitize";
import type { Options } from "rehype-sanitize";

/**
 * GitHub's sanitize schema plus exactly the classes and data attributes our own remark plugins
 * emit. Raw HTML in markdown is never parsed (no rehype-raw), so this is defence in depth.
 * Heading ids are added by rehype-slug AFTER sanitizing, so user text can't set an id.
 */
export const sanitizeSchema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter((def) => !(Array.isArray(def) && def[0] === "className")),
      ["className", "data-footnote-backref", "citation-chip"],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      [
        "className",
        "callout",
        "callout-note",
        "callout-tip",
        "callout-important",
        "callout-warning",
        "callout-caution",
      ],
      ["role", "note"],
      ["dataSpoiler", "block"],
      // ::youtube[id] (articles only): an 11-character YouTube id, nothing else.
      ["dataYoutube", /^[A-Za-z0-9_-]{11}$/],
    ],
    p: [["className", "callout-title"]],
    span: [["dataSpoiler", "inline"]],
  },
};
