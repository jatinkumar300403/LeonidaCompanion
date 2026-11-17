import { NextResponse, type NextRequest } from "next/server";
import type { ArticleType } from "@/config/articles";
import { parseIndexState } from "@/lib/articles/index-url";
import { getFlags } from "@/server/flags";
import { listArticles } from "@/server/articles/queries";

/**
 * Next page of a section index for LoadMore (SPEC §4 infinite scroll). Public data only, cached at
 * the edge for a minute. The same pages exist as real links (?cursor=) for crawlers and no-JS.
 */
const PUBLIC_TYPES = new Set<ArticleType>(["tip", "feature", "fact", "online"]);

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const type = params.type as ArticleType;
  if (!PUBLIC_TYPES.has(type)) return NextResponse.json({ error: "Unknown type." }, { status: 400 });
  if (type === "online" && !(await getFlags()).FEATURE_ONLINE) {
    return NextResponse.json({ error: "Unknown type." }, { status: 400 });
  }

  const state = parseIndexState(params);
  const page = await listArticles({
    type,
    tag: state.tag,
    spoilerFree: state.spoilerFree,
    sort: state.sort,
    cursor: state.cursor,
  });
  return NextResponse.json(page, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
