import { NextResponse, type NextRequest } from "next/server";
import { takeTestMagicLink } from "@/server/admin/test-auth";

/**
 * Dev-only test mailbox (D-044): returns the last sign-in link generated for an
 * `e2e-…@example.com` address. Always 404 outside `next dev`.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const link = takeTestMagicLink(email);
  if (!link) return NextResponse.json({ link: null }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ link }, { headers: { "Cache-Control": "no-store" } });
}
