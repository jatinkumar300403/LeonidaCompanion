import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { rateLimit } from "@/lib/ratelimit/limit";
import { buildUserExport } from "@/server/admin/user-data";
import { getSession } from "@/server/auth/session";

/** "Export my data" (SPEC §9): a JSON download of everything the signed-in user created. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const limit = await rateLimit("dataExport", session.userId);
  if (!limit.success) {
    return NextResponse.json(
      { error: "You've exported your data several times today. Please try again tomorrow." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const data = await buildUserExport(session.userId, session.email);
  const site = siteConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const who = session.profile?.username ?? "account";
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${site}-data-${who}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
