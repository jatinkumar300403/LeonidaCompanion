/**
 * RLS and trigger tests for every SPEC §11 rule (SPEC §15 "RLS tests"), run against DEV with
 * throwaway users: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hotRank } from "../../src/lib/forum/hot-rank";
import {
  admin,
  anon,
  cleanup,
  cleanupTasks,
  createTestUser,
  hasDevKeys,
  must,
  runId,
  sqlQuery,
  type TestUser,
} from "./helpers";

type Ids = {
  help: number;
  online: number;
  general: number;
  thread: number;
  heldThread: number;
  removedThread: number;
  post: number;
  heldPost: number;
  removedPost: number;
  published: string;
  draft: string;
  scheduled: string;
  approvedClip: number;
  pendingClip: number;
  notification: number;
};

describe.skipIf(!hasDevKeys)("RLS and triggers (DEV)", () => {
  let author: TestUser;
  let other: TestUser;
  let banned: TestUser;
  let mod: TestUser;
  let adminUser: TestUser;
  const ids = {} as Ids;

  const threadIds: number[] = [];
  const articleIds: string[] = [];
  const clipIds: number[] = [];

  async function seedThread(values: {
    category_id: number;
    author_id: string | null;
    title?: string;
    status?: string;
    score?: number;
    created_at?: string;
  }): Promise<number> {
    const row = must(
      await admin
        .from("threads")
        .insert({
          title: `RLS test thread ${runId} ${threadIds.length}`,
          slug: `rls-${runId}-${threadIds.length}`,
          body_md: "Body",
          ...values,
        })
        .select("id")
        .single(),
      "seed thread",
    );
    threadIds.push(row.id);
    return row.id;
  }

  async function seedPost(thread_id: number, author_id: string, status = "visible"): Promise<number> {
    return must(
      await admin.from("posts").insert({ thread_id, author_id, body_md: "A reply", status }).select("id").single(),
      "seed post",
    ).id;
  }

  beforeAll(async () => {
    [author, other, banned, mod, adminUser] = await Promise.all([
      createTestUser("author"),
      createTestUser("other"),
      createTestUser("banned", { banned: true }),
      createTestUser("mod", { role: "mod" }),
      createTestUser("admin", { role: "admin" }),
    ]);

    const categories = must(await admin.from("forum_categories").select("id, slug"), "categories");
    const bySlug = (slug: string) => categories.find((category) => category.slug === slug)!.id;
    ids.help = bySlug("help");
    ids.online = bySlug("online");
    ids.general = bySlug("general");

    ids.thread = await seedThread({ category_id: ids.help, author_id: author.id });
    ids.heldThread = await seedThread({ category_id: ids.help, author_id: author.id, status: "held" });
    ids.removedThread = await seedThread({ category_id: ids.help, author_id: author.id, status: "removed" });
    ids.post = await seedPost(ids.thread, author.id);
    ids.heldPost = await seedPost(ids.thread, author.id, "held");
    ids.removedPost = await seedPost(ids.thread, author.id, "removed");

    const articles = must(
      await admin
        .from("articles")
        .insert([
          {
            type: "tip",
            slug: `rls-${runId}-published`,
            title: "Published",
            status: "published",
            published_at: new Date(Date.now() - 60_000).toISOString(),
          },
          { type: "tip", slug: `rls-${runId}-draft`, title: "Draft", status: "draft" },
          {
            type: "tip",
            slug: `rls-${runId}-scheduled`,
            title: "Scheduled",
            status: "published",
            published_at: new Date(Date.now() + 86_400_000).toISOString(),
          },
        ])
        .select("id, slug"),
      "seed articles",
    );
    ids.published = articles.find((article) => article.slug.endsWith("published"))!.id;
    ids.draft = articles.find((article) => article.slug.endsWith("draft"))!.id;
    ids.scheduled = articles.find((article) => article.slug.endsWith("scheduled"))!.id;
    articleIds.push(ids.published, ids.draft, ids.scheduled);

    const clips = must(
      await admin
        .from("clips")
        .insert([
          {
            platform: "youtube",
            external_id: `rls-${runId}-a`,
            url: "https://www.youtube.com/watch?v=a",
            title: "Approved",
            status: "approved",
            submitted_by: other.id,
          },
          {
            platform: "youtube",
            external_id: `rls-${runId}-p`,
            url: "https://www.youtube.com/watch?v=p",
            title: "Pending",
            status: "pending",
            submitted_by: author.id,
          },
        ])
        .select("id, external_id"),
      "seed clips",
    );
    ids.approvedClip = clips.find((clip) => clip.external_id.endsWith("-a"))!.id;
    ids.pendingClip = clips.find((clip) => clip.external_id.endsWith("-p"))!.id;
    clipIds.push(ids.approvedClip, ids.pendingClip);

    ids.notification = must(
      await admin
        .from("notifications")
        .insert({ user_id: author.id, type: "admin_alert", payload: { test: runId } })
        .select("id")
        .single(),
      "seed notification",
    ).id;

    must(await admin.from("ask_logs").insert({ user_id: author.id, question: `rls ${runId}?` }), "seed ask_logs");
    must(await admin.from("ingest_runs").insert({ source_id: `rls-${runId}` }), "seed ingest_runs");
    must(
      await admin.from("moderation_actions").insert({
        actor_type: "ai",
        action: "hold",
        target_type: "post",
        target_id: String(ids.heldPost),
      }),
      "seed moderation_actions",
    );
    must(
      await admin.from("knowledge_chunks").insert({
        source_type: "article",
        source_ref: `rls-${runId}`,
        content: `leonida rls ${runId} chunk`,
      }),
      "seed knowledge_chunks",
    );

    cleanupTasks.push(
      () => admin.from("threads").delete().in("id", threadIds),
      () => admin.from("articles").delete().in("id", articleIds),
      () => admin.from("clips").delete().in("id", clipIds),
      () => admin.from("ask_logs").delete().like("question", `rls ${runId}%`),
      () => admin.from("ingest_runs").delete().eq("source_id", `rls-${runId}`),
      () =>
        admin
          .from("moderation_actions")
          .delete()
          .in("target_id", [String(ids.heldPost)]),
      () => admin.from("knowledge_chunks").delete().eq("source_ref", `rls-${runId}`),
    );
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("every table", () => {
    it("has RLS enabled on every table in the public schema", async () => {
      const rows = await sqlQuery<{ relname: string }>(
        "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace " +
          "where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity",
      );
      expect(rows.map((row) => row.relname)).toEqual([]);
    });
  });

  describe("public reads", () => {
    it("anon reads published articles but not drafts or scheduled ones", async () => {
      const rows = must(
        await anon().from("articles").select("id").in("id", [ids.published, ids.draft, ids.scheduled]),
        "articles",
      );
      expect(rows.map((row) => row.id)).toEqual([ids.published]);
    });

    it("mods read drafts and scheduled articles (the admin list), users don't", async () => {
      const all = [ids.published, ids.draft, ids.scheduled];
      expect(must(await mod.client.from("articles").select("id").in("id", all), "mod").length).toBe(3);
      expect(must(await author.client.from("articles").select("id").in("id", all), "user").length).toBe(1);
    });

    it("a helpful vote updates the counters but not updated_at (Phase 3)", async () => {
      const before = must(
        await admin.from("articles").select("updated_at, helpful_up").eq("id", ids.published).single(),
        "before",
      );
      must(
        await other.client
          .from("article_feedback")
          .insert({ article_id: ids.published, voter_key: other.id, value: 1 }),
        "vote",
      );
      const after = must(
        await admin.from("articles").select("updated_at, helpful_up").eq("id", ids.published).single(),
        "after",
      );
      expect(after.helpful_up).toBe(before.helpful_up + 1);
      expect(after.updated_at).toBe(before.updated_at);
      // An editorial change still touches it.
      must(await admin.from("articles").update({ title: "Published (edited)" }).eq("id", ids.published), "edit");
      const edited = must(await admin.from("articles").select("updated_at").eq("id", ids.published).single(), "e");
      expect(edited.updated_at).not.toBe(before.updated_at);
    });

    it("users can't vote on drafts", async () => {
      const vote = await other.client
        .from("article_feedback")
        .insert({ article_id: ids.draft, voter_key: other.id, value: 1 });
      expect(vote.error).not.toBeNull();
    });

    it("anon reads approved clips but not pending ones", async () => {
      const rows = must(await anon().from("clips").select("id").in("id", [ids.approvedClip, ids.pendingClip]), "clips");
      expect(rows.map((row) => row.id)).toEqual([ids.approvedClip]);
    });

    it("anon can't read held or removed threads", async () => {
      const rows = must(
        await anon().from("threads").select("id").in("id", [ids.thread, ids.heldThread, ids.removedThread]),
        "threads",
      );
      expect(rows.map((row) => row.id)).toEqual([ids.thread]);
    });

    it("anon can't read held or removed posts", async () => {
      const rows = must(
        await anon().from("posts").select("id").in("id", [ids.post, ids.heldPost, ids.removedPost]),
        "posts",
      );
      expect(rows.map((row) => row.id)).toEqual([ids.post]);
    });

    it("profiles are public through public columns and public_profiles only", async () => {
      const client = anon();
      const view = must(
        await client.from("public_profiles").select("username, reputation").eq("id", author.id).single(),
        "public_profiles",
      );
      expect(view.username).toBe(author.username);
      const privateColumns = await client.from("profiles").select("age_confirmed_at, is_banned").eq("id", author.id);
      expect(privateColumns.error?.message).toMatch(/permission denied/i);
      const star = await client.from("profiles").select("*").eq("id", author.id);
      expect(star.error).not.toBeNull();
    });

    it("site settings and forum categories are public", async () => {
      const flags = must(await anon().from("site_settings").select("value").eq("key", "flags").single(), "flags");
      expect(flags.value).toMatchObject({ FEATURE_ONLINE: false });
      expect(must(await anon().from("forum_categories").select("id"), "categories").length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("authors and mods see held content", () => {
    it("the author sees their own held thread and post", async () => {
      const threads = must(
        await author.client.from("threads").select("id").in("id", [ids.heldThread, ids.removedThread]),
        "threads",
      );
      expect(threads.map((row) => row.id).sort()).toEqual([ids.heldThread, ids.removedThread].sort());
      const posts = must(await author.client.from("posts").select("id").eq("id", ids.heldPost), "posts");
      expect(posts).toHaveLength(1);
    });

    it("another user doesn't", async () => {
      expect(must(await other.client.from("threads").select("id").eq("id", ids.heldThread), "t")).toHaveLength(0);
      expect(must(await other.client.from("posts").select("id").eq("id", ids.heldPost), "p")).toHaveLength(0);
    });

    it("a mod does", async () => {
      expect(must(await mod.client.from("threads").select("id").eq("id", ids.heldThread), "t")).toHaveLength(1);
      expect(must(await mod.client.from("posts").select("id").eq("id", ids.heldPost), "p")).toHaveLength(1);
    });
  });

  describe("inserts: authenticated, not banned, as yourself", () => {
    const thread = (author_id: string, category_id = ids.help, status = "open") => ({
      author_id,
      category_id,
      status,
      title: `RLS insert test ${runId}`,
      slug: `rls-insert-${runId}`,
      body_md: "Body",
    });

    it("a user starts a thread as themselves", async () => {
      const row = must(
        await author.client.from("threads").insert(thread(author.id)).select("id").single(),
        "insert thread",
      );
      threadIds.push(row.id);
    });

    it("a user can't post as someone else", async () => {
      const result = await author.client.from("threads").insert(thread(other.id));
      expect(result.error?.message).toMatch(/row-level security/i);
    });

    it("anon can't insert", async () => {
      const result = await anon().from("threads").insert(thread(author.id));
      expect(result.error).not.toBeNull();
    });

    it("a banned user can't insert threads, posts, votes, clips or reports", async () => {
      expect((await banned.client.from("threads").insert(thread(banned.id))).error?.message).toMatch(
        /row-level security/i,
      );
      expect(
        (await banned.client.from("posts").insert({ thread_id: ids.thread, author_id: banned.id, body_md: "x" })).error,
      ).not.toBeNull();
      expect(
        (
          await banned.client
            .from("votes")
            .insert({ user_id: banned.id, target_type: "thread", target_id: ids.thread, value: 1 })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await banned.client.from("reports").insert({
            reporter_id: banned.id,
            target_type: "thread",
            target_id: String(ids.thread),
            reason: "spam",
          })
        ).error,
      ).not.toBeNull();
    });

    it("users can't set a status like solved or removed on insert", async () => {
      expect((await author.client.from("threads").insert(thread(author.id, ids.help, "solved"))).error).not.toBeNull();
    });

    it("the locked Online category takes threads from mods only", async () => {
      expect((await author.client.from("threads").insert(thread(author.id, ids.online))).error).not.toBeNull();
      const row = must(
        await mod.client.from("threads").insert(thread(mod.id, ids.online)).select("id").single(),
        "mod thread",
      );
      threadIds.push(row.id);
    });

    it("users can't write scores or counters", async () => {
      const result = await author.client.from("threads").insert({ ...thread(author.id), score: 99 } as never);
      expect(result.error?.message).toMatch(/permission denied/i);
    });
  });

  describe("updates: owner within edit rules, or mod", () => {
    it("a user can't edit someone else's post", async () => {
      const result = await other.client.from("posts").update({ body_md: "hacked" }).eq("id", ids.post).select("id");
      expect(result.data ?? []).toHaveLength(0);
      const row = must(await admin.from("posts").select("body_md").eq("id", ids.post).single(), "post");
      expect(row.body_md).toBe("A reply");
    });

    it("the owner edits their post and it is marked edited", async () => {
      must(await author.client.from("posts").update({ body_md: "A reply, edited" }).eq("id", ids.post), "edit");
      const row = must(await admin.from("posts").select("body_md, edited_at").eq("id", ids.post).single(), "post");
      expect(row.body_md).toBe("A reply, edited");
      expect(row.edited_at).not.toBeNull();
    });

    it("the owner can't edit or restore a removed post; a mod can", async () => {
      const own = await author.client.from("posts").update({ status: "visible" }).eq("id", ids.removedPost);
      expect(own.error?.message).toMatch(/post_not_editable/);
      must(await mod.client.from("posts").update({ status: "visible" }).eq("id", ids.removedPost), "mod restore");
      must(await mod.client.from("posts").update({ status: "removed" }).eq("id", ids.removedPost), "mod remove");
    });

    it("a mod can edit anyone's thread", async () => {
      must(await mod.client.from("threads").update({ is_spoiler: true }).eq("id", ids.thread), "mod edit");
    });

    it("a user can't change their role, reputation or ban state", async () => {
      for (const change of [{ role: "admin" }, { reputation: 1000 }, { is_banned: false }]) {
        const result = await banned.client
          .from("profiles")
          .update(change as never)
          .eq("id", banned.id);
        expect(result.error?.message).toMatch(/permission denied/i);
      }
      const row = must(await admin.from("profiles").select("role, is_banned").eq("id", banned.id).single(), "p");
      expect(row).toEqual({ role: "user", is_banned: true });
    });

    it("a user can't edit someone else's profile", async () => {
      const result = await other.client.from("profiles").update({ bio: "hacked" }).eq("id", author.id).select("id");
      expect(result.data ?? []).toHaveLength(0);
    });

    it("a banned user can't change their public profile text", async () => {
      const result = await banned.client.from("profiles").update({ bio: "spam" }).eq("id", banned.id);
      expect(result.error?.message).toMatch(/account_banned/);
    });
  });

  describe("owner-only: votes, blocks, notifications", () => {
    it("a vote updates the score and can't be cast as someone else", async () => {
      const otherThread = await seedThread({ category_id: ids.general, author_id: other.id });
      must(
        await author.client
          .from("votes")
          .insert({ user_id: author.id, target_type: "thread", target_id: otherThread, value: 1 }),
        "vote",
      );
      const scored = must(await admin.from("threads").select("score").eq("id", otherThread).single(), "score");
      expect(scored.score).toBe(1);

      const forged = await author.client
        .from("votes")
        .insert({ user_id: other.id, target_type: "thread", target_id: otherThread, value: 1 });
      expect(forged.error).not.toBeNull();
      expect(must(await other.client.from("votes").select("user_id").eq("user_id", author.id), "votes")).toHaveLength(
        0,
      );

      must(await author.client.from("votes").delete().eq("user_id", author.id).eq("target_id", otherThread), "unvote");
      expect(must(await admin.from("threads").select("score").eq("id", otherThread).single(), "s").score).toBe(0);
    });

    it("nobody votes on their own content", async () => {
      const result = await author.client
        .from("votes")
        .insert({ user_id: author.id, target_type: "thread", target_id: ids.thread, value: 1 });
      expect(result.error?.message).toMatch(/cannot_vote_on_own_content/);
    });

    it("post votes change the author's reputation (+2 up, −1 down)", async () => {
      const before = must(
        await admin.from("profiles").select("reputation").eq("id", author.id).single(),
        "r",
      ).reputation;
      must(
        await other.client
          .from("votes")
          .insert({ user_id: other.id, target_type: "post", target_id: ids.post, value: 1 }),
        "upvote",
      );
      expect(must(await admin.from("profiles").select("reputation").eq("id", author.id).single(), "r").reputation).toBe(
        before + 2,
      );
      must(
        await other.client.from("votes").update({ value: -1 }).eq("user_id", other.id).eq("target_id", ids.post),
        "downvote",
      );
      expect(must(await admin.from("profiles").select("reputation").eq("id", author.id).single(), "r").reputation).toBe(
        before - 1,
      );
      must(await other.client.from("votes").delete().eq("user_id", other.id).eq("target_id", ids.post), "unvote");
    });

    it("a user can't read or change another user's notifications", async () => {
      expect(must(await other.client.from("notifications").select("id").eq("id", ids.notification), "n")).toHaveLength(
        0,
      );
      const write = await other.client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", ids.notification)
        .select("id");
      expect(write.data ?? []).toHaveLength(0);
      expect(must(await author.client.from("notifications").select("id").eq("id", ids.notification), "n")).toHaveLength(
        1,
      );
      must(
        await author.client
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", ids.notification),
        "mark read",
      );
    });

    it("users can't create notifications", async () => {
      const result = await author.client.from("notifications").insert({ user_id: other.id, type: "mention" });
      expect(result.error).not.toBeNull();
    });

    it("blocks belong to the blocker", async () => {
      must(await author.client.from("blocks").insert({ blocker_id: author.id, blocked_id: banned.id }), "block");
      expect(
        must(await other.client.from("blocks").select("blocker_id").eq("blocker_id", author.id), "b"),
      ).toHaveLength(0);
      expect(
        (await author.client.from("blocks").insert({ blocker_id: other.id, blocked_id: banned.id })).error,
      ).not.toBeNull();
      must(await author.client.from("blocks").delete().eq("blocker_id", author.id), "unblock");
    });
  });

  describe("forum triggers", () => {
    it("a reply bumps reply_count and notifies the thread author and mentions", async () => {
      const thread = await seedThread({ category_id: ids.general, author_id: author.id });
      const post = must(
        await other.client
          .from("posts")
          .insert({ thread_id: thread, author_id: other.id, body_md: `Thanks! cc @${mod.username}` })
          .select("id")
          .single(),
        "reply",
      );
      const counted = must(await admin.from("threads").select("reply_count").eq("id", thread).single(), "count");
      expect(counted.reply_count).toBe(1);

      const notes = must(
        await admin.from("notifications").select("user_id, type").contains("payload", { post_id: post.id }),
        "notes",
      );
      expect(notes).toEqual(
        expect.arrayContaining([
          { user_id: author.id, type: "thread_reply" },
          { user_id: mod.id, type: "mention" },
        ]),
      );

      // Soft delete by the owner: body becomes "[deleted]" and the reply stops counting.
      must(await other.client.from("posts").update({ status: "deleted" }).eq("id", post.id), "soft delete");
      const deleted = must(await admin.from("posts").select("body_md").eq("id", post.id).single(), "p");
      expect(deleted.body_md).toBe("[deleted]");
      expect(must(await admin.from("threads").select("reply_count").eq("id", thread).single(), "c").reply_count).toBe(
        0,
      );
    });

    it("the author accepts an answer: thread solved, +10 reputation; others can't", async () => {
      const thread = await seedThread({ category_id: ids.help, author_id: author.id });
      const answer = await seedPost(thread, other.id);
      const before = must(
        await admin.from("profiles").select("reputation").eq("id", other.id).single(),
        "r",
      ).reputation;

      const stranger = await mod.client.from("threads").select("id").eq("id", thread);
      expect(stranger.data).toHaveLength(1);
      const notMine = await banned.client
        .from("threads")
        .update({ accepted_post_id: answer })
        .eq("id", thread)
        .select("id");
      expect(notMine.data ?? []).toHaveLength(0);

      must(await author.client.from("threads").update({ accepted_post_id: answer }).eq("id", thread), "accept");
      const solved = must(await admin.from("threads").select("status").eq("id", thread).single(), "t");
      expect(solved.status).toBe("solved");
      expect(must(await admin.from("profiles").select("reputation").eq("id", other.id).single(), "r").reputation).toBe(
        before + 10,
      );
    });

    it("hot_threads orders by score / (hours + 2)^1.5, like the TS hotRank", async () => {
      const now = Date.now();
      const specs = [
        { score: 3, hours: 1 },
        { score: 40, hours: 30 },
        { score: 10, hours: 5 },
      ];
      const created = await Promise.all(
        specs.map((spec) =>
          seedThread({
            category_id: ids.general,
            author_id: other.id,
            score: spec.score,
            created_at: new Date(now - spec.hours * 3_600_000).toISOString(),
          }),
        ),
      );
      const rows = must(await anon().rpc("hot_threads", { p_category_id: ids.general, p_limit: 100 }), "hot");
      const order = rows.map((row) => row.id).filter((id) => created.includes(id));
      const expected = specs
        .map((spec, index) => ({
          id: created[index]!,
          rank: hotRank(spec.score, new Date(now - spec.hours * 3_600_000)),
        }))
        .sort((a, b) => b.rank - a.rank)
        .map((entry) => entry.id);
      expect(order).toEqual(expected);

      const sqlRank = must(
        await anon().rpc("hot_rank", { p_score: 10, p_created_at: new Date(now - 5 * 3_600_000).toISOString() }),
        "hot_rank",
      );
      expect(sqlRank).toBeCloseTo(hotRank(10, new Date(now - 5 * 3_600_000)), 3);
    });
  });

  describe("service-role and staff-only tables", () => {
    it("ask_logs and ingest_runs: admins read, users and mods don't, nobody writes", async () => {
      expect(must(await author.client.from("ask_logs").select("id"), "asks")).toHaveLength(0);
      expect(must(await mod.client.from("ingest_runs").select("id"), "runs")).toHaveLength(0);
      expect(must(await adminUser.client.from("ask_logs").select("id").eq("user_id", author.id), "a").length).toBe(1);
      expect(
        must(await adminUser.client.from("ingest_runs").select("id").eq("source_id", `rls-${runId}`), "r").length,
      ).toBe(1);
      expect((await adminUser.client.from("ask_logs").insert({ question: "x" })).error).not.toBeNull();
    });

    it("wiki_pages, knowledge_chunks and newsletter_subscribers are closed to the API", async () => {
      for (const table of ["wiki_pages", "knowledge_chunks", "newsletter_subscribers"] as const) {
        const read = await adminUser.client.from(table).select("id").limit(1);
        expect(read.error?.message ?? "").toMatch(/permission denied/i);
      }
    });

    it("knowledge_chunks is read only through the retrieval functions, on the server", async () => {
      expect((await anon().rpc("search_chunks_fts", { q: `rls ${runId}` })).error?.message).toMatch(
        /permission denied/i,
      );
      const rows = must(await admin.rpc("search_chunks_fts", { q: `leonida rls ${runId}` }), "fts");
      expect(rows.length).toBe(1);
    });

    it("moderation_actions: mods read and log their own actions; users can't", async () => {
      expect(must(await author.client.from("moderation_actions").select("id"), "m")).toHaveLength(0);
      expect(
        must(await mod.client.from("moderation_actions").select("id").eq("target_id", String(ids.heldPost)), "m")
          .length,
      ).toBe(1);
      expect(
        (
          await author.client
            .from("moderation_actions")
            .insert({ actor_id: author.id, actor_type: "human", action: "remove", target_type: "post", target_id: "1" })
        ).error,
      ).not.toBeNull();
      must(
        await mod.client.from("moderation_actions").insert({
          actor_id: mod.id,
          actor_type: "human",
          action: "note",
          target_type: "post",
          target_id: String(ids.heldPost),
        }),
        "mod log",
      );
    });

    it("reports: users file their own, only mods read them", async () => {
      must(
        await author.client.from("reports").insert({
          reporter_id: author.id,
          target_type: "post",
          target_id: String(ids.post),
          reason: "spam",
        }),
        "report",
      );
      expect(must(await author.client.from("reports").select("id").eq("reporter_id", author.id), "r")).toHaveLength(0);
      expect(must(await mod.client.from("reports").select("id").eq("reporter_id", author.id), "r")).toHaveLength(1);
      cleanupTasks.push(() => admin.from("reports").delete().eq("reporter_id", author.id));
    });

    it("site settings: only admins write", async () => {
      const userWrite = await mod.client
        .from("site_settings")
        .update({ value: { hacked: true } })
        .eq("key", "flags")
        .select("key");
      expect(userWrite.data ?? []).toHaveLength(0);
      const original = must(await admin.from("site_settings").select("value").eq("key", "flags").single(), "flags");
      must(
        await adminUser.client.from("site_settings").update({ value: original.value }).eq("key", "flags"),
        "admin write",
      );
    });

    it("a non-admin can't write articles; an admin can", async () => {
      const article = (slug: string) => ({ type: "tip", slug, title: "T" });
      expect((await author.client.from("articles").insert(article(`rls-${runId}-u`))).error).not.toBeNull();
      expect((await mod.client.from("articles").insert(article(`rls-${runId}-m`))).error).not.toBeNull();
      const updated = await mod.client.from("articles").update({ title: "x" }).eq("id", ids.published).select("id");
      expect(updated.data ?? []).toHaveLength(0);
      const row = must(
        await adminUser.client
          .from("articles")
          .insert(article(`rls-${runId}-a`))
          .select("id")
          .single(),
        "admin article",
      );
      articleIds.push(row.id);
    });

    it("a published fact needs a status, and a confirmed one a source (rule 7)", async () => {
      const fact = {
        type: "fact",
        slug: `rls-${runId}-fact`,
        title: "F",
        status: "published",
        published_at: new Date().toISOString(),
      };
      expect((await admin.from("articles").insert(fact)).error?.message).toMatch(/articles_published_fact_status/);
      expect((await admin.from("articles").insert({ ...fact, fact_status: "confirmed" })).error?.message).toMatch(
        /articles_confirmed_needs_source/,
      );
    });
  });

  describe("storage", () => {
    const png = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: "image/webp" });

    it("users upload avatars only into their own folder", async () => {
      const own = await author.client.storage.from("avatars").upload(`${author.id}/rls-${runId}.webp`, png, {
        contentType: "image/webp",
      });
      expect(own.error).toBeNull();
      cleanupTasks.push(() => admin.storage.from("avatars").remove([`${author.id}/rls-${runId}.webp`]));

      const foreign = await author.client.storage.from("avatars").upload(`${other.id}/rls-${runId}.webp`, png, {
        contentType: "image/webp",
      });
      expect(foreign.error).not.toBeNull();
    });

    it("avatars must be WebP", async () => {
      const result = await author.client.storage
        .from("avatars")
        .upload(`${author.id}/rls-${runId}.svg`, new Blob(["<svg/>"], { type: "image/svg+xml" }), {
          contentType: "image/svg+xml",
        });
      expect(result.error).not.toBeNull();
    });

    it("only admins upload article images", async () => {
      const path = `rls-${runId}.webp`;
      expect(
        (await mod.client.storage.from("article-images").upload(path, png, { contentType: "image/webp" })).error,
      ).not.toBeNull();
      expect(
        (await adminUser.client.storage.from("article-images").upload(path, png, { contentType: "image/webp" })).error,
      ).toBeNull();
      cleanupTasks.push(() => admin.storage.from("article-images").remove([path]));
    });
  });

  describe("sign-up and seed admin", () => {
    it("handle_new_user creates a profile only from complete sign-up metadata", async () => {
      const complete = await createTestUser("meta", {
        profile: false,
        metadata: { username: `r${runId}_meta`, age_confirmed: true, terms_accepted: true, platform: "both" },
      });
      const { data: profile } = await admin
        .from("profiles")
        .select("username, platform")
        .eq("id", complete.id)
        .maybeSingle();
      expect(profile).toEqual({ username: `r${runId}_meta`, platform: "both" });

      const partial = await createTestUser("nometa", { profile: false, metadata: { username: `r${runId}_nometa` } });
      const { data: none } = await admin.from("profiles").select("id").eq("id", partial.id).maybeSingle();
      expect(none).toBeNull();
    });

    it("reserved usernames are refused", async () => {
      const user = await createTestUser("resv", { profile: false });
      const now = new Date().toISOString();
      const result = await user.client
        .from("profiles")
        .insert({ id: user.id, username: "moderator", age_confirmed_at: now, terms_accepted_at: now });
      expect(result.error?.message).toMatch(/username_reserved/);
    });

    it("users create only their own profile, as a plain user", async () => {
      const user = await createTestUser("self", { profile: false });
      const now = new Date().toISOString();
      const forged = await user.client
        .from("profiles")
        .insert({ id: other.id, username: `r${runId}_forged`, age_confirmed_at: now, terms_accepted_at: now });
      expect(forged.error).not.toBeNull();
      const asAdmin = await user.client.from("profiles").insert({
        id: user.id,
        username: `r${runId}_self`,
        role: "admin",
        age_confirmed_at: now,
        terms_accepted_at: now,
      } as never);
      expect(asAdmin.error?.message).toMatch(/permission denied/i);
      must(
        await user.client
          .from("profiles")
          .insert({ id: user.id, username: `r${runId}_self`, age_confirmed_at: now, terms_accepted_at: now }),
        "own profile",
      );
    });

    it("set_seed_admin promotes the owner now or as soon as their profile exists", async () => {
      const owner = await createTestUser("owner", { profile: false });
      cleanupTasks.push(() => sqlQuery(`delete from private.seed_admins where email = '${owner.email}'`, false));
      expect((await owner.client.rpc("set_seed_admin", { p_email: owner.email })).error).not.toBeNull();
      expect(must(await admin.rpc("set_seed_admin", { p_email: owner.email }), "seed")).toBe(false);

      const now = new Date().toISOString();
      must(
        await owner.client
          .from("profiles")
          .insert({ id: owner.id, username: `r${runId}_owner`, age_confirmed_at: now, terms_accepted_at: now }),
        "owner profile",
      );
      const row = must(await admin.from("profiles").select("role").eq("id", owner.id).single(), "role");
      expect(row.role).toBe("admin");
    });
  });
});
