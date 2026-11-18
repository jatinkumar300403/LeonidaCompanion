/**
 * Phase 5 clip rules in the database (D-070): submissions only through the server, mod review
 * and its notifications, votes only on approved clips, hot_clips and the weekly snapshots.
 * Runs against DEV with throwaway users: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hotRank } from "../../src/lib/forum/hot-rank";
import { admin, anon, cleanup, cleanupTasks, createTestUser, hasDevKeys, must, runId, type TestUser } from "./helpers";

describe.skipIf(!hasDevKeys)("clip rules (DEV, Phase 5)", () => {
  let member: TestUser;
  let voter: TestUser;
  let mod: TestUser;
  const clipIds: number[] = [];
  const weeks: string[] = [];
  let seq = 0;

  type ClipSeed = {
    submitted_by?: string | null;
    status?: "pending" | "approved" | "rejected" | "removed";
    category?: "funny" | "epic" | "fail" | "stunt" | "glitch" | "other";
    score?: number;
    approved_at?: string | null;
  };

  async function seedClip(extra: ClipSeed = {}): Promise<number> {
    seq += 1;
    const row = must(
      await admin
        .from("clips")
        .insert({
          platform: "youtube",
          external_id: `rls-${runId}-c${seq}`,
          url: `https://www.youtube.com/watch?v=rls${runId}${seq}`,
          title: `Clip rule test ${runId} number ${seq}`,
          creator_name: "Test creator",
          creator_url: "https://www.youtube.com/@test",
          submitted_by: member.id,
          ...extra,
        })
        .select("id")
        .single(),
      "seed clip",
    );
    clipIds.push(row.id);
    return row.id;
  }

  const reputation = async (id: string) =>
    must(await admin.from("profiles").select("reputation").eq("id", id).single(), "rep").reputation;

  beforeAll(async () => {
    [member, voter, mod] = await Promise.all([
      createTestUser("cmember"),
      createTestUser("cvoter"),
      createTestUser("cmod", { role: "mod" }),
    ]);
    cleanupTasks.push(
      () => admin.from("clips").delete().in("id", clipIds),
      () => admin.from("clip_weekly").delete().in("week", weeks),
      () => admin.from("votes").delete().eq("target_type", "clip").in("target_id", clipIds),
    );
  });

  afterAll(cleanup);

  it("members can't insert clips directly, even as themselves (the server inserts them)", async () => {
    const result = await member.client.from("clips").insert({
      platform: "youtube",
      external_id: `rls-${runId}-direct`,
      url: "https://www.youtube.com/watch?v=direct",
      title: "Made-up metadata",
      submitted_by: member.id,
    });
    expect(result.error).not.toBeNull();
    expect(must(await admin.from("clips").select("id").eq("external_id", `rls-${runId}-direct`), "check")).toHaveLength(
      0,
    );
  });

  it("submitters see their pending clip; anon and other members don't", async () => {
    const id = await seedClip();
    expect(must(await member.client.from("clips").select("id").eq("id", id), "own")).toHaveLength(1);
    expect(must(await voter.client.from("clips").select("id").eq("id", id), "other")).toHaveLength(0);
    expect(must(await anon().from("clips").select("id").eq("id", id), "anon")).toHaveLength(0);
  });

  it("only mods change a clip's status", async () => {
    const id = await seedClip();
    const attempt = await member.client.from("clips").update({ status: "approved" }).eq("id", id).select("id");
    expect(attempt.data ?? []).toHaveLength(0);
    expect(must(await admin.from("clips").select("status").eq("id", id).single(), "status").status).toBe("pending");
  });

  it("approving stamps approved_at, gives +5 reputation and notifies with the clip title", async () => {
    const id = await seedClip();
    const before = await reputation(member.id);
    must(await mod.client.from("clips").update({ status: "approved" }).eq("id", id).select("id"), "approve");

    const clip = must(await admin.from("clips").select("approved_at").eq("id", id).single(), "clip");
    expect(clip.approved_at).not.toBeNull();
    expect(await reputation(member.id)).toBe(before + 5);

    const notes = must(
      await member.client.from("notifications").select("type, payload").eq("type", "clip_approved"),
      "notes",
    );
    const note = notes.find((row) => (row.payload as { clip_id?: number }).clip_id === id);
    expect(note?.payload).toMatchObject({ clip_id: id, clip_title: `Clip rule test ${runId} number ${seq}` });
  });

  it("rejecting a pending clip notifies the submitter with the reason", async () => {
    const id = await seedClip();
    must(
      await mod.client
        .from("clips")
        .update({ status: "rejected", reject_reason: "Not GTA VI" })
        .eq("id", id)
        .select("id"),
      "reject",
    );
    const notes = must(
      await member.client.from("notifications").select("payload").eq("type", "clip_rejected"),
      "notes",
    );
    expect(notes.map((row) => row.payload)).toContainEqual(
      expect.objectContaining({ clip_id: id, reason: "Not GTA VI" }),
    );
  });

  it("votes count on approved clips only, never on your own, and move the score", async () => {
    const approved = await seedClip({ status: "approved", approved_at: new Date().toISOString() });
    const pending = await seedClip();

    must(
      await voter.client
        .from("votes")
        .insert({ user_id: voter.id, target_type: "clip", target_id: approved, value: 1 }),
      "vote",
    );
    expect(must(await admin.from("clips").select("score").eq("id", approved).single(), "score").score).toBe(1);

    const onPending = await mod.client
      .from("votes")
      .insert({ user_id: mod.id, target_type: "clip", target_id: pending, value: 1 });
    expect(onPending.error).not.toBeNull();

    const own = await member.client
      .from("votes")
      .insert({ user_id: member.id, target_type: "clip", target_id: approved, value: 1 });
    expect(own.error).not.toBeNull();

    must(
      await voter.client.from("votes").delete().match({ user_id: voter.id, target_type: "clip", target_id: approved }),
      "unvote",
    );
    expect(must(await admin.from("clips").select("score").eq("id", approved).single(), "score").score).toBe(0);
  });

  it("hot_clips lists approved clips only, by category, in hot-rank order", async () => {
    const now = Date.now();
    const specs = [
      { score: 3, hours: 1 },
      { score: 40, hours: 30 },
      { score: 10, hours: 5 },
    ];
    const created = await Promise.all(
      specs.map((spec) =>
        seedClip({
          status: "approved",
          category: "stunt",
          score: spec.score,
          approved_at: new Date(now - spec.hours * 3_600_000).toISOString(),
        }),
      ),
    );
    const hiddenPending = await seedClip({ category: "stunt", score: 999 });
    const otherCategory = await seedClip({
      status: "approved",
      category: "fail",
      score: 999,
      approved_at: new Date(now).toISOString(),
    });

    const rows = must(await anon().rpc("hot_clips", { p_category: "stunt", p_limit: 100 }), "hot");
    const ids = rows.map((row) => row.id);
    expect(ids).not.toContain(hiddenPending);
    expect(ids).not.toContain(otherCategory);

    const expected = specs
      .map((spec, index) => ({
        id: created[index]!,
        rank: hotRank(spec.score, new Date(now - spec.hours * 3_600_000)),
      }))
      .sort((a, b) => b.rank - a.rank)
      .map((entry) => entry.id);
    expect(ids.filter((id) => created.includes(id))).toEqual(expected);
  });

  it("weekly snapshots are public to read and written by the service role only", async () => {
    const week = `2001-w${String(10 + (parseInt(runId, 16) % 40)).padStart(2, "0")}`;
    weeks.push(week);
    expect((await member.client.from("clip_weekly").insert({ week, clip_ids: [] })).error).not.toBeNull();
    expect((await mod.client.from("clip_weekly").insert({ week, clip_ids: [] })).error).not.toBeNull();
    must(
      await admin
        .from("clip_weekly")
        .insert({ week, clip_ids: [1, 2] })
        .select("week"),
      "admin insert",
    );
    const rows = must(await anon().from("clip_weekly").select("clip_ids").eq("week", week), "read");
    expect(rows[0]?.clip_ids).toEqual([1, 2]);
  });
});
