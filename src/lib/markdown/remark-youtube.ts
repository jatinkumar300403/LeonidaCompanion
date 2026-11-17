import type { Paragraph, Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * `::youtube[VIDEO_ID]` on its own line (SPEC §4 articles) → <div data-youtube="VIDEO_ID">, which
 * MarkdownRenderer swaps for the click-to-load ClipEmbed facade (CLAUDE.md rule 1). Only an
 * 11-character YouTube id is accepted; anything else stays plain text. Articles only.
 */
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const DIRECTIVE = /^::youtube\[([A-Za-z0-9_-]{11})\]$/;

function toEmbed(paragraph: Paragraph): void {
  if (paragraph.children.length !== 1) return;
  const only = paragraph.children[0];
  if (only.type !== "text") return;
  const match = DIRECTIVE.exec(only.value.trim());
  if (!match) return;
  paragraph.children = [];
  paragraph.data = { ...paragraph.data, hName: "div", hProperties: { dataYoutube: match[1] } };
}

export function remarkYoutube() {
  return (tree: Root) => {
    visit(tree, "paragraph", toEmbed);
  };
}
