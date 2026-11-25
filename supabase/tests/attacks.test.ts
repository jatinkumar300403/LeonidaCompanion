/**
 * Phase 10 QA hardening: attacks on RLS and the write guards from the anon and member clients,
 * beyond the per-phase suites. Every attempt here must fail (or change nothing). Also the abuse
 * cases that the database itself must hold: huge bodies past the app layer, duplicate clip rows.
 * Runs against DEV with throwaway users: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, cleanup, cleanupTasks, createTestUser, hasDevKeys, must, runId, type TestUser } from "./helpers";

describe.skipIf(!hasDevKeys)("attacks (DEV, Phase 10)", () => {
  let author: TestUser;
  let attacker: TestUser;
  let helper: TestUser;
  let general: number;
  let online: number;
  const threadIds: number[] = [];
  const clipIds: number[] = [];
  const articleIds: string[] = [];
  let seq = 0;

  async function seedThread(authorId: string, extra: Record<string, unknown> = {}): Promise<number> {
    seq += 1;
    const row = must(
      await admin
        .from("threads")
        .insert({
          category_id: general,
          author_id: authorId,
          title: `Attack test ${runId} number ${seq}`,
          slug: `rls-attack-${runId}-${seq}`,
          body_md: "A question body that is long enough.",
          ...extra,
        })
        .select("id")
        .single(),
      "seed thread",
    );
    threadIds.push(row.id);
    return row.id;
  }

  async function seedPost(threadId: number, authorId: string, extra: Record<string, unknown> = {}) {
    return must(
      await admin
        .from("posts")
        .insert({ thread_id: threadId, author_id: authorId, body_md: "A seeded reply", ...extra })
        .select("id")
        .single(),
      "seed post",
    ).id;
  }

  async function seedArticle(status: "published" | "draft"): Promise<string> {
    seq += 1;
    const row = must(
      await admin
        .from("articles")
        .insert({
          type: "tip",
          slug: `rls-attack-${runId}-${seq}`,
          title: `Attack test article ${runId} ${seq}`,
          summary: "A summary for the attack test.",
          body_md: "Body.",
          status,
          published_at: status === "published" ? new Date(Date.now() - 60_000).toISOString() : null,
        })
        .select("id")
        .single(),
      "seed article",
    );
    articleIds.push(row.id);
    return row.id;
  }

  const score = async (table: "threads" | "posts", id: number) =>
    must(await admin.from(table).select("score").eq("id", id).single(), "score").score;
  const reputation = async (id: string) =>
    must(await admin.from("profiles").select("reputation").eq("id", id).single(), "rep").reputation;

  beforeAll(async () => {
    [author, attacker, helper] = await Promise.all([
      createTestUser("aauthor"),
      createTestUser("aattack"),
      createTestUser("ahelper"),
    ]);
    const categories = must(await admin.from("forum_categories").select("id, slug"), "categories");
    general = categories.find((category) => category.slug === "general")!.id;
    online = categories.find((category) => category.slug === "online")!.id;
    const users = [author, attacker, helper].map((user) => user.id);
    cleanupTasks.push(
      () => admin.from("votes").delete().in("user_id", users),
      () => admin.from("article_feedback").delete().in("voter_key", users),
      () => admin.from("threads").delete().in("id", threadIds),
      () => admin.from("clips").delete().in("id", clipIds),
      () => admin.from("articles").delete().in("id", articleIds),
    );
  });

  afterAll(cleanup);

  describe("vote integrity (D-100)", () => {
    it("a vote can't be moved to another target, so scores and reputation can't be farmed", async () => {
      const threadId = await seedThread(author.id);
      const postA = await seedPost(threadId, author.id);
      const postB = await seedPost(threadId, author.id);
      const repBefore = await reputation(author.id);

      must(
        await attacker.client
          .from("votes")
          .insert({ user_id: attacker.id, target_type: "post", target_id: postA, value: 1 }),
        "vote",
      );
      expect(await score("posts", postA)).toBe(1);

      // The farming move: retarget the row (no score change anywhere), then vote on A again.
      const moved = await attacker.client
        .from("votes")
        .update({ target_id: postB })
        .match({ user_id: attacker.id, target_type: "post", target_id: postA })
        .select("target_id");
      expect(moved.error?.message ?? (moved.data?.length === 0 ? "no rows" : "moved")).not.toBe("moved");

      const again = await attacker.client
        .from("votes")
        .insert({ user_id: attacker.id, target_type: "post", target_id: postA, value: 1 });
      expect(again.error).not.toBeNull(); // still one vote per member per target

      expect(await score("posts", postA)).toBe(1);
      expect(await score("posts", postB)).toBe(0);
      expect(await reputation(author.id)).toBe(repBefore + 2);
    });

    it("a vote can't be handed to another member or retyped", async () => {
      const threadId = await seedThread(author.id);
      must(
        await attacker.client
          .from("votes")
          .insert({ user_id: attacker.id, target_type: "thread", target_id: threadId, value: 1 }),
        "vote",
      );
      for (const change of [{ user_id: helper.id }, { target_type: "clip" }] as const) {
        const result = await attacker.client
          .from("votes")
          .update(change)
          .match({ user_id: attacker.id, target_type: "thread", target_id: threadId })
          .select("user_id");
        expect(result.error?.message ?? (result.data?.length === 0 ? "no rows" : "changed")).not.toBe("changed");
      }
      expect(await score("threads", threadId)).toBe(1);
    });

    it("the vote upsert the app uses still changes the value", async () => {
      const threadId = await seedThread(author.id);
      const row = { user_id: attacker.id, target_type: "thread", target_id: threadId } as const;
      must(
        await attacker.client
          .from("votes")
          .upsert({ ...row, value: 1 }, { onConflict: "user_id,target_type,target_id" }),
        "up",
      );
      must(
        await attacker.client
          .from("votes")
          .upsert({ ...row, value: -1 }, { onConflict: "user_id,target_type,target_id" }),
        "down",
      );
      expect(await score("threads", threadId)).toBe(-1);
    });

    it("helpful feedback can't be moved onto another article (a draft, say)", async () => {
      const published = await seedArticle("published");
      const draft = await seedArticle("draft");
      must(
        await attacker.client
          .from("article_feedback")
          .insert({ article_id: published, voter_key: attacker.id, value: 1 }),
        "feedback",
      );
      const moved = await attacker.client
        .from("article_feedback")
        .update({ article_id: draft })
        .match({ article_id: published, voter_key: attacker.id })
        .select("article_id");
      expect(moved.error?.message ?? (moved.data?.length === 0 ? "no rows" : "moved")).not.toBe("moved");
      const counts = must(await admin.from("articles").select("helpful_up").eq("id", draft).single(), "draft");
      expect(counts.helpful_up).toBe(0);

      // The app's upsert (same article and key) still flips the value.
      must(
        await attacker.client
          .from("article_feedback")
          .upsert({ article_id: published, voter_key: attacker.id, value: -1 }, { onConflict: "article_id,voter_key" }),
        "flip",
      );
      const after = must(
        await admin.from("articles").select("helpful_up, helpful_down").eq("id", published).single(),
        "pub",
      );
      expect(after).toEqual({ helpful_up: 0, helpful_down: 1 });
    });
  });

  describe("forum guards", () => {
    it("an author can't un-hold their own held thread or reply", async () => {
      const held = await seedThread(attacker.id, { status: "held" });
      const thread = await attacker.client.from("threads").update({ status: "open" }).eq("id", held).select("id");
      expect(thread.error).not.toBeNull();

      const open = await seedThread(author.id);
      const heldPost = await seedPost(open, attacker.id, { status: "held" });
      const post = await attacker.client.from("posts").update({ status: "visible" }).eq("id", heldPost).select("id");
      expect(post.error).not.toBeNull();
      const rows = must(await admin.from("posts").select("status").eq("id", heldPost).single(), "post");
      expect(rows.status).toBe("held");
    });

    it("an author can't move their thread into the locked Online category", async () => {
      const id = await seedThread(attacker.id);
      const result = await attacker.client.from("threads").update({ category_id: online }).eq("id", id).select("id");
      expect(result.error).not.toBeNull();
    });

    it("an author can't accept a reply from another thread, or mark the thread solved directly", async () => {
      const mine = await seedThread(attacker.id);
      const other = await seedThread(author.id);
      const foreign = await seedPost(other, helper.id);
      const accept = await attacker.client
        .from("threads")
        .update({ accepted_post_id: foreign })
        .eq("id", mine)
        .select("id");
      expect(accept.error).not.toBeNull();
      const solved = await attacker.client.from("threads").update({ status: "solved" }).eq("id", mine).select("id");
      expect(solved.error).not.toBeNull();
    });

    it("nobody replies in held, removed or locked threads", async () => {
      for (const status of ["held", "removed", "locked"] as const) {
        const id = await seedThread(author.id, { status });
        const reply = await attacker.client
          .from("posts")
          .insert({ thread_id: id, author_id: attacker.id, body_md: "Sneaking a reply in." });
        expect(reply.error, status).not.toBeNull();
      }
    });

    it("a member can't vote on a held thread they can't see", async () => {
      const held = await seedThread(author.id, { status: "held" });
      const vote = await attacker.client
        .from("votes")
        .insert({ user_id: attacker.id, target_type: "thread", target_id: held, value: 1 });
      expect(vote.error).not.toBeNull();
    });

    it("blocks can't be read or rewritten by other members", async () => {
      must(await author.client.from("blocks").insert({ blocker_id: author.id, blocked_id: helper.id }), "block");
      const read = must(await attacker.client.from("blocks").select("blocker_id").eq("blocker_id", author.id), "read");
      expect(read).toHaveLength(0);
      const rewrite = await author.client
        .from("blocks")
        .update({ blocked_id: attacker.id })
        .eq("blocker_id", author.id)
        .select("blocked_id");
      expect(rewrite.data ?? []).toHaveLength(0);
      await admin.from("blocks").delete().eq("blocker_id", author.id);
    });
  });

  describe("staff-only data and functions", () => {
    it("members can't resolve reports or edit clips", async () => {
      seq += 1;
      const clip = must(
        await admin
          .from("clips")
          .insert({
            platform: "youtube",
            external_id: `rls-${runId}-atk${seq}`,
            url: `https://www.youtube.com/watch?v=atk${runId}${seq}`,
            title: "Attack test clip",
            submitted_by: attacker.id,
          })
          .select("id")
          .single(),
        "clip",
      ).id;
      clipIds.push(clip);
      const edit = await attacker.client
        .from("clips")
        .update({ title: "Renamed", status: "approved" })
        .eq("id", clip)
        .select("id");
      expect(edit.data ?? []).toHaveLength(0);
      const row = must(await admin.from("clips").select("status, title").eq("id", clip).single(), "clip row");
      expect(row).toEqual({ status: "pending", title: "Attack test clip" });

      const report = await attacker.client
        .from("reports")
        .insert({ reporter_id: attacker.id, target_type: "thread", target_id: "1", reason: "spam" });
      expect(report.error).toBeNull(); // members file reports, but can't read or resolve them
      const resolve = await attacker.client
        .from("reports")
        .update({ status: "dismissed" })
        .eq("reporter_id", attacker.id)
        .select("id");
      expect(resolve.data ?? []).toHaveLength(0);
      await admin.from("reports").delete().eq("reporter_id", attacker.id);
    });

    it("anon and members can't call the private functions", async () => {
      const calls = [
        () => anon().rpc("get_my_profile"),
        () => attacker.client.rpc("set_seed_admin" as never),
        () => attacker.client.rpc("match_chunks" as never, { query_embedding: [], match_count: 1 } as never),
        () => anon().rpc("mod_ban_user" as never, { target: author.id } as never),
      ];
      for (const call of calls) expect((await call()).error).not.toBeNull();
    });

    it("members can't delete or overwrite someone else's avatar", async () => {
      const path = `${author.id}/rls-${runId}.webp`;
      const webp = Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64");
      must(await author.client.storage.from("avatars").upload(path, webp, { contentType: "image/webp" }), "upload");
      cleanupTasks.push(() => admin.storage.from("avatars").remove([path]));

      const removed = await attacker.client.storage.from("avatars").remove([path]);
      expect(removed.data ?? []).toHaveLength(0);
      const overwrite = await attacker.client.storage
        .from("avatars")
        .upload(path, webp, { contentType: "image/webp", upsert: true });
      expect(overwrite.error).not.toBeNull();
      const listed = must(await admin.storage.from("avatars").list(author.id), "list");
      expect(listed.map((file) => file.name)).toContain(`rls-${runId}.webp`);
    });
  });

  describe("abuse the database must hold", () => {
    it("huge bodies are refused even when they skip the app layer", async () => {
      const huge = "x".repeat(200_000);
      const thread = await attacker.client.from("threads").insert({
        category_id: general,
        author_id: attacker.id,
        title: `Huge body ${runId}`,
        slug: `rls-attack-huge-${runId}`,
        body_md: huge,
      });
      expect(thread.error).not.toBeNull();
      const open = await seedThread(author.id);
      const post = await attacker.client
        .from("posts")
        .insert({ thread_id: open, author_id: attacker.id, body_md: huge });
      expect(post.error).not.toBeNull();
      const bio = await attacker.client.from("profiles").update({ bio: huge }).eq("id", attacker.id);
      expect(bio.error).not.toBeNull();
      const title = await attacker.client.from("threads").insert({
        category_id: general,
        author_id: attacker.id,
        title: "t".repeat(5_000),
        slug: `rls-attack-title-${runId}`,
        body_md: "A question body that is long enough.",
      });
      expect(title.error).not.toBeNull();
    });

    it("two simultaneous submissions of the same clip store one row", async () => {
      const row = {
        platform: "youtube" as const,
        external_id: `rls-${runId}-dupe`,
        url: `https://www.youtube.com/watch?v=dupe${runId}`,
        title: "Duplicate test clip",
        submitted_by: attacker.id,
      };
      const results = await Promise.all([
        admin.from("clips").insert(row).select("id"),
        admin
          .from("clips")
          .insert({ ...row, submitted_by: helper.id })
          .select("id"),
      ]);
      const stored = results.flatMap((result) => result.data ?? []);
      clipIds.push(...stored.map((clip) => clip.id));
      expect(stored).toHaveLength(1);
      expect(results.filter((result) => result.error?.code === "23505")).toHaveLength(1);
    });
  });
});
