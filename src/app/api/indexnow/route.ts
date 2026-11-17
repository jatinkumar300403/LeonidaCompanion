import { env } from "@/env";

/** IndexNow key file (served as `keyLocation`, src/lib/indexnow.ts). 404 while INDEXNOW_KEY is unset. */
export function GET() {
  if (!env.INDEXNOW_KEY) return new Response(null, { status: 404 });
  return new Response(env.INDEXNOW_KEY, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
