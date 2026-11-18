import { DELETED_USER } from "@/config/forum";

/**
 * Quote reply (SPEC §5): the quoted text as a markdown blockquote headed "@user wrote:". Long
 * posts are cut at a word boundary, and a spoiler cut in half is closed again so it stays hidden.
 */
export const QUOTE_MAX = 400;

export function buildQuote(username: string | null, markdown: string, max = QUOTE_MAX): string {
  let text = markdown
    .replace(/^\s{0,3}>.*$/gm, "") // drop quotes inside the quote
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length > max) {
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(" ");
    text = `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
    if ((text.match(/\|\|/g) ?? []).length % 2 === 1) text = `${text}||`;
  }
  const who = username ? `@${username}` : DELETED_USER;
  const lines = text.split("\n").map((line) => (line ? `> ${line}` : ">"));
  return `> **${who}** wrote:\n${lines.join("\n")}\n\n`;
}
