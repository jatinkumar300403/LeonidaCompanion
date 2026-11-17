import { NextResponse, type NextRequest } from "next/server";
import { integrations } from "@/env";
import { clientIp } from "@/lib/ratelimit/keys";
import { rateLimit } from "@/lib/ratelimit/limit";
import { normalizeUsername, usernameProblem } from "@/lib/validation/profile";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type UsernameCheck = { available: boolean; reason: string | null };

const noStore = { "Cache-Control": "no-store" };

/** Live username check for onboarding (SPEC §9). Rate-limited per IP. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u") ?? "";
  const problem = usernameProblem(raw);
  if (problem) return NextResponse.json<UsernameCheck>({ available: false, reason: problem }, { headers: noStore });
  if (!integrations.supabase) {
    return NextResponse.json<UsernameCheck>(
      { available: false, reason: "Sign-up isn't open yet." },
      { headers: noStore },
    );
  }

  const limit = await rateLimit("usernameCheck", clientIp(request.headers));
  if (!limit.success) {
    return NextResponse.json<UsernameCheck>(
      { available: false, reason: "Too many checks. Slow down a little." },
      { status: 429, headers: { ...noStore, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const name = normalizeUsername(raw);
  const supabase = await createSupabaseServerClient();
  const [taken, reserved] = await Promise.all([
    supabase.from("profiles").select("id").eq("username", name).maybeSingle(),
    supabase.from("reserved_usernames").select("name").eq("name", name).maybeSingle(),
  ]);
  if (taken.error || reserved.error) {
    return NextResponse.json<UsernameCheck>(
      { available: false, reason: "Couldn't check right now." },
      { status: 503, headers: noStore },
    );
  }
  const reason = taken.data ? "That username is taken." : reserved.data ? "That username is reserved." : null;
  return NextResponse.json<UsernameCheck>({ available: reason === null, reason }, { headers: noStore });
}
