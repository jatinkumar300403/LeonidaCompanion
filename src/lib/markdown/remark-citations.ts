import type { Link, PhrasingContent, Root, Text } from "mdast";
import { SKIP, visit } from "unist-util-visit";

/**
 * AI answers cite sources as [1], [2]… (SPEC §8.1). This turns each citation whose number is
 * within 1..max into a small chip linking to #source-n in the Sources list. Other brackets stay text.
 */

const CITATION = /\[(\d{1,2})\]/g;

function chip(n: number): Link {
  return {
    type: "link",
    url: `#source-${n}`,
    children: [{ type: "text", value: String(n) }],
    data: { hProperties: { className: ["citation-chip"], ariaLabel: `Source ${n}` } },
  };
}

function splitCitations(node: Text, max: number): PhrasingContent[] | null {
  const parts: PhrasingContent[] = [];
  let last = 0;
  let found = false;
  for (const match of node.value.matchAll(CITATION)) {
    const n = Number(match[1]);
    if (n < 1 || n > max) continue;
    found = true;
    const start = match.index;
    if (start > last) parts.push({ type: "text", value: node.value.slice(last, start) });
    parts.push(chip(n));
    last = start + match[0].length;
  }
  if (!found) return null;
  if (last < node.value.length) parts.push({ type: "text", value: node.value.slice(last) });
  return parts;
}

export function remarkCitations(options: { max: number }) {
  const max = Math.max(0, options.max);
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (node.type === "link" || node.type === "linkReference") return SKIP;
      if (node.type !== "text" || !parent || index === undefined) return;
      const replacement = splitCitations(node, max);
      if (!replacement) return;
      parent.children.splice(index, 1, ...(replacement as typeof parent.children));
      return [SKIP, index + replacement.length];
    });
  };
}
