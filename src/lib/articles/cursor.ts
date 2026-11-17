/**
 * Keyset cursors for the section indexes (SPEC §4: cursor pagination + an <a> "Load more").
 * A cursor is the sort key of the last item shown, base64url-encoded JSON. Anything malformed
 * decodes to null, which simply means "first page".
 */
export const ARTICLE_SORTS = ["latest", "helpful"] as const;
export type ArticleSort = (typeof ARTICLE_SORTS)[number];

export type ArticleCursor =
  | { sort: "latest"; publishedAt: string; id: string }
  | { sort: "helpful"; helpfulUp: number; publishedAt: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: ArticleCursor): string {
  const payload =
    cursor.sort === "latest"
      ? ["l", cursor.publishedAt, cursor.id]
      : ["h", cursor.helpfulUp, cursor.publishedAt, cursor.id];
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

export function decodeCursor(raw: string | null | undefined, sort: ArticleSort): ArticleCursor | null {
  if (!raw || raw.length > 200) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(value)) return null;
    if (sort === "latest" && value[0] === "l" && value.length === 3) {
      const [, publishedAt, id] = value;
      if (validTimestamp(publishedAt) && typeof id === "string" && UUID.test(id)) {
        return { sort, publishedAt, id };
      }
    }
    if (sort === "helpful" && value[0] === "h" && value.length === 4) {
      const [, helpfulUp, publishedAt, id] = value;
      if (
        Number.isSafeInteger(helpfulUp) &&
        (helpfulUp as number) >= 0 &&
        validTimestamp(publishedAt) &&
        typeof id === "string" &&
        UUID.test(id)
      ) {
        return { sort, helpfulUp: helpfulUp as number, publishedAt, id };
      }
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * The PostgREST `or` filter that selects rows after the cursor, for an ordering of
 * (published_at desc, id desc) or (helpful_up desc, published_at desc, id desc).
 * Values are double-quoted so timestamps with ":" and "+" survive the filter syntax.
 */
export function cursorFilter(cursor: ArticleCursor): string {
  const at = `"${cursor.publishedAt}"`;
  const id = `"${cursor.id}"`;
  const afterByDate = `published_at.lt.${at},and(published_at.eq.${at},id.lt.${id})`;
  if (cursor.sort === "latest") return afterByDate;
  const up = cursor.helpfulUp;
  return `helpful_up.lt.${up},and(helpful_up.eq.${up},published_at.lt.${at}),and(helpful_up.eq.${up},published_at.eq.${at},id.lt.${id})`;
}

export function parseSort(value: string | null | undefined): ArticleSort {
  return value === "helpful" ? "helpful" : "latest";
}
