/**
 * Article slugs (SPEC §4, §15 "slugify" unit test). The database accepts
 * `^[a-z0-9]+(-[a-z0-9]+)*$` up to 120 characters, unique per article type.
 */
export const SLUG_MAX = 120;
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Lose a 5★ wanted level — fast!" → "lose-a-5-wanted-level-fast". Empty input gives "". */
export function slugify(input: string, max = SLUG_MAX): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= max) return base;
  // Cut at a word boundary when one is reasonably close to the limit.
  const cut = base.slice(0, max);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > max * 0.6 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug);
}

/** The first of `base`, `base-2`, `base-3`… that isn't taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base || "article";
  if (!used.has(root)) return root;
  for (let n = 2; n < 10_000; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("No free slug.");
}
