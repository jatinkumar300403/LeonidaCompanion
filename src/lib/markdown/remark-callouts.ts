import type { Blockquote, Paragraph, Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * GitHub-style alerts (SPEC §4): a blockquote starting with [!NOTE], [!TIP], [!IMPORTANT],
 * [!WARNING] or [!CAUTION] becomes <div class="callout callout-tip" role="note"> with a title line.
 */

export const CALLOUT_TITLES = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
} as const;

export type CalloutType = keyof typeof CALLOUT_TITLES;

const MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*(?:\r?\n)?/i;

function transformBlockquote(node: Blockquote): void {
  const first = node.children[0];
  if (!first || first.type !== "paragraph") return;
  const head = first.children[0];
  if (!head || head.type !== "text") return;
  const match = MARKER.exec(head.value);
  if (!match) return;

  const type = match[1].toLowerCase() as CalloutType;
  head.value = head.value.slice(match[0].length);
  if (head.value === "") first.children.shift();
  if (first.children[0]?.type === "break") first.children.shift();
  if (first.children.length === 0) node.children.shift();

  const title: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: CALLOUT_TITLES[type] }],
    data: { hProperties: { className: ["callout-title"] } },
  };
  node.children.unshift(title);
  node.data = {
    ...node.data,
    hName: "div",
    hProperties: { className: ["callout", `callout-${type}`], role: "note" },
  };
}

export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, "blockquote", transformBlockquote);
  };
}
