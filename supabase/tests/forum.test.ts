/**
 * Phase 4 forum rules in the database (D-061 to D-064): new-account limits, links only from
 * trusted accounts, the 30-minute edit window, quote-reply notifications, mentions in threads and
 * the "similar threads" search. Runs against DEV with throwaway users: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { containsLink } from "../../src/lib/forum/rules";
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

describe.skipIf(!hasDevKeys)("forum rules (DEV, Phase 4)", () => {
  let newbie: TestUser;
  let member: TestUser;
  let lowRep: TestUser;
  let replier: TestUser;
  let blocker: TestUser;
  let mod: TestUser;
  let help: number;
  let general: number;
  const threadIds: number[] = [];
  let seq = 0;

  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

  function threadRow(authorId: string, extra: Record<string, unknown> = {}) {
    seq += 1;
    return {
      category_id: general,
      author_id: authorId,
      title: `Forum rule test ${runId} number ${seq}`,
      slug: `rls-forum-${runId}-${seq}`,
      body_md: "A question body that is long enough.",
      ...extra,
    };
  }

  async function seedThread(authorId: string, extra: Record<string, unknown> = {}): Promise<number> {
    const row = must(await admin.from("threads").insert(threadRow(authorId, extra)).select("id").single(), "seed");
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

  beforeAll(async () => {
    [newbie, member, lowRep, replier, blocker, mod] = await Promise.all([
      createTestUser("newbie", { fresh: true }),
      createTestUser("member"),
      createTestUser("lowrep", { reputation: 10 }),
      createTestUser("replier"),
      createTestUser("blocker"),
      createTestUser("fmod", { role: "mod" }),
    ]);
    const categories = must(await admin.from("forum_categories").select("id, slug"), "categories");
    help = categories.find((category) => category.slug === "help")!.id;
    general = categories.find((category) => category.slug === "general")!.id;

    const authors = [newbie, member, lowRep, replier, blocker, mod].map((user) => user.id);
    cleanupTasks.push(
      () => admin.from("threads").delete().in("id", threadIds),
      () => admin.from("threads").delete().in("author_id", authors),
    );
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("new-account limits (SPEC §5)", () => {
    it("a new account starts at most 3 threads a day; an established one isn't capped", async () => {
      for (let i = 0; i < 3; i++) {
        const row = must(
          await newbie.client.from("threads").insert(threadRow(newbie.id)).select("id").single(),
          `newbie thread ${i}`,
        );
        threadIds.push(row.id);
      }
      const fourth = await newbie.client.from("threads").insert(threadRow(newbie.id));
      expect(fourth.error?.message).toMatch(/new_account_thread_limit/);

      for (let i = 0; i < 4; i++) {
        const row = must(
          await member.client.from("threads").insert(threadRow(member.id)).select("id").single(),
          `member thread ${i}`,
        );
        threadIds.push(row.id);
      }
    });

    it("a new account posts at most 20 replies a day", async () => {
      const thread = await seedThread(member.id);
      must(
        await admin
          .from("posts")
          .insert(
            Array.from({ length: 20 }, (_, i) => ({ thread_id: thread, author_id: newbie.id, body_md: `#${i}` })),
          ),
        "seed 20 posts",
      );
      const result = await newbie.client
        .from("posts")
        .insert({ thread_id: thread, author_id: newbie.id, body_md: "One more" });
      expect(result.error?.message).toMatch(/new_account_post_limit/);
    });
  });

  describe("links (rep ≥ 20 and a day-old account)", () => {
    it("matches the TypeScript containsLink() on the same inputs", async () => {
      const samples = [
        "plain text",
        "see https://example.com",
        "HTTP://EXAMPLE.COM",
        "go to www.example.com",
        "[text](/relative)",
        "<mailto:a@b.co>",
        "intro\n  [1]: //evil.example",
        "email me at a@b.co",
        "@someone said hi",
        "a [bracket] then (paren)",
      ];
      const literal = samples.map((sample) => `$t$${sample}$t$`).join(", ");
      // A pure SELECT, but the read-only Management API role can't execute private.* helpers.
      const rows = await sqlQuery<{ s: string; c: boolean }>(
        `select s, private.contains_link(s) as c from unnest(array[${literal}]) as s`,
        false,
      );
      expect(rows.map((row) => row.c)).toEqual(samples.map((sample) => containsLink(sample)));
    });

    it("new and low-reputation accounts can't post links; trusted ones can", async () => {
      const thread = await seedThread(member.id);
      const newThread = await lowRep.client
        .from("threads")
        .insert(threadRow(lowRep.id, { body_md: "Look here: https://example.com/guide please" }));
      expect(newThread.error?.message).toMatch(/links_need_reputation/);

      const lowRepPost = await lowRep.client
        .from("posts")
        .insert({ thread_id: thread, author_id: lowRep.id, body_md: "try www.example.com" });
      expect(lowRepPost.error?.message).toMatch(/links_need_reputation/);

      must(
        await member.client
          .from("posts")
          .insert({ thread_id: thread, author_id: member.id, body_md: "Source: https://example.com/a" }),
        "trusted link",
      );
    });

    it("an edit can't add a link without trust", async () => {
      const thread = await seedThread(member.id);
      const post = must(
        await lowRep.client
          .from("posts")
          .insert({ thread_id: thread, author_id: lowRep.id, body_md: "No link yet" })
          .select("id")
          .single(),
        "post",
      );
      const edit = await lowRep.client.from("posts").update({ body_md: "[now](https://x.example)" }).eq("id", post.id);
      expect(edit.error?.message).toMatch(/links_need_reputation/);
    });
  });

  describe("the 30-minute edit window", () => {
    it("authors can't edit after 30 minutes but can still delete; mods can edit", async () => {
      const oldThread = await seedThread(member.id, { created_at: minutesAgo(31) });
      const oldPost = await seedPost(oldThread, member.id, { created_at: minutesAgo(31) });

      const postEdit = await member.client.from("posts").update({ body_md: "Too late" }).eq("id", oldPost);
      expect(postEdit.error?.message).toMatch(/edit_window_closed/);
      const titleEdit = await member.client
        .from("threads")
        .update({ title: "A new title that is too late" })
        .eq("id", oldThread);
      expect(titleEdit.error?.message).toMatch(/edit_window_closed/);
      const tagEdit = await member.client
        .from("threads")
        .update({ tags: ["money"] })
        .eq("id", oldThread);
      expect(tagEdit.error?.message).toMatch(/edit_window_closed/);

      must(await mod.client.from("posts").update({ body_md: "Fixed by a mod" }).eq("id", oldPost), "mod edit");
      must(await member.client.from("posts").update({ status: "deleted" }).eq("id", oldPost), "soft delete post");
      must(await member.client.from("threads").update({ body_md: "[deleted]" }).eq("id", oldThread), "soft delete");
      const thread = must(await admin.from("threads").select("title, body_md").eq("id", oldThread).single(), "t");
      expect(thread.body_md).toBe("[deleted]");
      expect(thread.title).toContain("Forum rule test");
    });

    it("edits inside the window work and stamp edited_at", async () => {
      const thread = await seedThread(member.id);
      must(
        await member.client.from("threads").update({ body_md: "An edited question body." }).eq("id", thread),
        "edit",
      );
      const row = must(await admin.from("threads").select("edited_at").eq("id", thread).single(), "t");
      expect(row.edited_at).not.toBeNull();
    });
  });

  describe("notifications", () => {
    it("a quote reply notifies the quoted author once, the thread author once, and keeps the slug", async () => {
      const thread = await seedThread(member.id);
      const quoted = await seedPost(thread, lowRep.id);
      const reply = must(
        await replier.client
          .from("posts")
          .insert({
            thread_id: thread,
            author_id: replier.id,
            reply_to_post_id: quoted,
            body_md: `> @${lowRep.username} wrote:\n> A seeded reply\n\nAgreed, @${member.username}.`,
          })
          .select("id")
          .single(),
        "reply",
      );
      const notes = must(
        await admin.from("notifications").select("user_id, type, payload").contains("payload", { post_id: reply.id }),
        "notes",
      );
      expect(notes.map((note) => [note.user_id, note.type]).sort()).toEqual(
        [
          [lowRep.id, "post_reply"],
          [member.id, "thread_reply"],
        ].sort(),
      );
      const slug = must(await admin.from("threads").select("slug").eq("id", thread).single(), "slug").slug;
      for (const note of notes) expect(note.payload).toMatchObject({ thread_slug: slug, actor: replier.username });
    });

    it("a reply can't quote a post from another thread", async () => {
      const first = await seedThread(member.id);
      const second = await seedThread(member.id);
      const elsewhere = await seedPost(second, lowRep.id);
      const result = await replier.client
        .from("posts")
        .insert({ thread_id: first, author_id: replier.id, reply_to_post_id: elsewhere, body_md: "Quote" });
      expect(result.error?.message).toMatch(/invalid_reply_target/);
    });

    it("mentions in a new thread notify, except people who blocked the author", async () => {
      must(await blocker.client.from("blocks").insert({ blocker_id: blocker.id, blocked_id: replier.id }), "block");
      const row = must(
        await replier.client
          .from("threads")
          .insert(threadRow(replier.id, { body_md: `Any ideas @${member.username} or @${blocker.username}?` }))
          .select("id")
          .single(),
        "thread",
      );
      threadIds.push(row.id);
      const notes = must(
        await admin.from("notifications").select("user_id, type, payload").contains("payload", { thread_id: row.id }),
        "notes",
      );
      expect(notes.map((note) => [note.user_id, note.type])).toEqual([[member.id, "mention"]]);
      expect(notes[0]!.payload).not.toHaveProperty("post_id");
    });
  });

  describe("reads", () => {
    it("similar_threads finds a near title for anon, but never a held thread", async () => {
      const token = `zq${runId}`;
      const visible = await seedThread(member.id, { title: `Where is the ${token} motorbike garage on the map` });
      const held = await seedThread(member.id, {
        title: `Where is the ${token} motorbike garage on the map?`,
        status: "held",
      });
      const rows = must(
        await anon().rpc("similar_threads", { p_query: `${token} motorbike garage`, p_limit: 10 }),
        "similar",
      );
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(visible);
      expect(ids).not.toContain(held);
    });

    it("threads carry a 280-character excerpt, and anon category counts skip held threads", async () => {
      const long = await seedThread(member.id, { category_id: help, body_md: "x".repeat(600) });
      const excerpt = must(await admin.from("threads").select("excerpt").eq("id", long).single(), "e").excerpt;
      expect(excerpt).toHaveLength(280);

      await seedThread(member.id, { category_id: help, status: "held" });
      const counted = must(
        await anon().from("forum_categories").select("id, threads(count)").eq("id", help).single(),
        "anon count",
      );
      const visible = await admin
        .from("threads")
        .select("id", { count: "exact", head: true })
        .eq("category_id", help)
        .in("status", ["open", "solved", "locked"]);
      expect((counted.threads as unknown as { count: number }[])[0]!.count).toBe(visible.count);
    });
  });
});
