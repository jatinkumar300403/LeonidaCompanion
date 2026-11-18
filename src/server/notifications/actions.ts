"use server";

import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit/limit";
import { getSession } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Marks in-app notifications read (SPEC §9 bell). The bell reads them in the browser under RLS;
 * writes come here so they are rate-limited. RLS and the column grant allow only `read_at` on the
 * user's own rows.
 */
const idsSchema = z.union([z.literal("all"), z.array(z.number().int().positive()).min(1).max(100)]);

export async function markNotificationsRead(ids: "all" | number[]): Promise<{ ok: boolean }> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false };
  const session = await getSession();
  if (!session?.profile) return { ok: false };
  const limit = await rateLimit("notificationsRead", session.userId);
  if (!limit.success) return { ok: false };

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);
  if (parsed.data !== "all") query = query.in("id", parsed.data);
  const { error } = await query;
  if (error) console.error("[notifications] mark read failed:", error.code, error.message);
  return { ok: !error };
}
