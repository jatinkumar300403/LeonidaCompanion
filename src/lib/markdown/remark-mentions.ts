import type { Link, PhrasingContent, Root, Text } from "mdast";
import { SKIP, visit } from "unist-util-visit";

/**
 * `@username` in forum posts → a link to the profile (SPEC §5 mentions). Usernames follow the
 * sign-up rule (3–20 of a-z, 0-9, _). Text already inside a link stays as it is; code is never
 * a text node, so it's skipped too. The database sends the matching notifications.
 */
const MENTION = /(^|[^a-zA-Z0-9_@/.])@([a-zA-Z0-9_]{3,20})(?![a-zA-Z0-9_])/g;

function split(value: string): PhrasingContent[] | null {
  const parts: PhrasingContent[] = [];
  let last = 0;
  for (const match of value.matchAll(MENTION)) {
    const start = match.index + match[1]!.length;
    const name = match[2]!.toLowerCase();
    if (start > last) parts.push({ type: "text", value: value.slice(last, start) });
    const link: Link = {
      type: "link",
      url: `/u/${name}`,
      children: [{ type: "text", value: `@${match[2]}` }],
      data: { hProperties: { className: ["mention"] } },
    };
    parts.push(link);
    last = start + 1 + match[2]!.length;
  }
  if (parts.length === 0) return null;
  if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
  return parts;
}

export function remarkMentions() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      if (parent.type === "link" || parent.type === "linkReference") return;
      const parts = split(node.value);
      if (!parts) return;
      parent.children.splice(index, 1, ...(parts as typeof parent.children));
      return [SKIP, index + parts.length];
    });
  };
}
