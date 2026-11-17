import type { Paragraph, PhrasingContent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * `||spoiler||` syntax (CLAUDE.md rule 5).
 * - Inline: `before ||hidden part|| after` → <span data-spoiler="inline">hidden part</span>
 * - Block: a paragraph that is nothing but one spoiler → <div data-spoiler="block">…</div>
 * Delimiters pair left to right inside one paragraph/heading/cell; formatting between them is kept.
 * An unmatched `||` stays literal text. Code spans are never touched (they aren't text nodes).
 * MarkdownRenderer maps the data attributes to the accessible InlineSpoiler/SpoilerBlock components.
 */

const DELIMITER = "||";

/** Parents whose children are phrasing content that may contain spoilers. */
const PHRASING_PARENTS = new Set(["paragraph", "heading", "tableCell", "emphasis", "strong", "delete", "link"]);

type Token = { delimiter: true } | { delimiter: false; node: PhrasingContent };

function textNode(value: string): Text {
  return { type: "text", value };
}

/** An mdast node that remark-rehype turns into <span data-spoiler="inline">. */
function spoilerNode(children: PhrasingContent[]): PhrasingContent {
  return {
    type: "emphasis",
    children,
    data: { hName: "span", hProperties: { dataSpoiler: "inline" } },
  };
}

function isSpoiler(node: PhrasingContent): boolean {
  return node.type === "emphasis" && node.data?.hProperties?.dataSpoiler === "inline";
}

function mergeText(nodes: PhrasingContent[]): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  for (const node of nodes) {
    const last = out.at(-1);
    if (node.type === "text" && last?.type === "text") {
      last.value += node.value;
    } else {
      out.push(node);
    }
  }
  return out.filter((node) => node.type !== "text" || node.value !== "");
}

export function transformSpoilers(children: PhrasingContent[]): PhrasingContent[] {
  if (!children.some((child) => child.type === "text" && child.value.includes(DELIMITER))) {
    return children;
  }

  const tokens: Token[] = [];
  for (const child of children) {
    if (child.type === "text" && child.value.includes(DELIMITER)) {
      child.value.split(DELIMITER).forEach((part, index) => {
        if (index > 0) tokens.push({ delimiter: true });
        if (part) tokens.push({ delimiter: false, node: textNode(part) });
      });
    } else {
      tokens.push({ delimiter: false, node: child });
    }
  }

  const out: PhrasingContent[] = [];
  let open: PhrasingContent[] | null = null;
  for (const token of tokens) {
    if (token.delimiter) {
      if (open === null) {
        open = [];
      } else {
        out.push(open.length > 0 ? spoilerNode(mergeText(open)) : textNode(DELIMITER + DELIMITER));
        open = null;
      }
    } else {
      (open ?? out).push(token.node);
    }
  }
  if (open !== null) {
    out.push(textNode(DELIMITER), ...open);
  }
  return mergeText(out);
}

function promoteBlockSpoiler(paragraph: Paragraph): void {
  const meaningful = paragraph.children.filter((child) => !(child.type === "text" && child.value.trim() === ""));
  const only = meaningful[0];
  if (meaningful.length !== 1 || !only || !isSpoiler(only) || only.type !== "emphasis") return;
  paragraph.children = only.children;
  paragraph.data = { ...paragraph.data, hName: "div", hProperties: { dataSpoiler: "block" } };
}

export function remarkSpoiler() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (!PHRASING_PARENTS.has(node.type) || !("children" in node)) return;
      const parent = node as { children: PhrasingContent[] };
      parent.children = transformSpoilers(parent.children);
    });
    visit(tree, "paragraph", promoteBlockSpoiler);
  };
}
