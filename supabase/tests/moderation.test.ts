/**
 * Phase 6 moderation rules in the database (D-082, D-083): the ban and role RPCs, mod tools under
 * RLS, the moderation outcome notifications and the audit log's new columns.
 * Runs against DEV with throwaway users: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, cleanupTasks, createTestUser, hasDevKeys, must, runId, type TestUser } from "./helpers";

/** A permanent ban (p_until null). The generated RPC types don't model nullable arguments. */
const PERMANENT = null as unknown as string;

describe.skipIf(!hasDevKeys)("moderation rules (DEV, Phase 6)", () => {
  let member: TestUser;
  let other: TestUser;
  let mod: TestUser;
  let mod2: TestUser;
  let adminUser: TestUser;
  let categoryId: number;
  const threadIds: number[] = [];
  let seq = 0;

  async function seedThread(authorId: string, status: "open" | "held" = "open"): Promise<{ id: number; slug: string }> {
    seq += 1;
    const slug = `mod-rule-${runId}-${seq}`;
    const row = must(
      await admin
        .from("threads")
        .insert({
          category_id: categoryId,
          author_id: authorId,
          title: `E2E moderation rule ${runId} thread ${seq}`,
          slug,
          body_md: "A test question about the camera settings.",
          status,
        })
        .select("id, slug")
        .single(),
      "seed thread",
    );
    threadIds.push(row.id);
    return row;
  }

  async function seedPost(threadId: number, authorId: string, status: "visible" | "held" = "visible") {
    return must(
      await admin
        .from("posts")
        .insert({ thread_id: threadId, author_id: authorId, body_md: `Reply ${runId} ${++seq}`, status })
        .select("id")
        .single(),
      "seed post",
    ).id;
  }

  const notificationsFor = async (userId: string, type: string) =>
    must(
      await admin.from("notifications").select("type, payload").eq("user_id", userId).eq("type", type),
      "notifications",
    );

  const profileOf = async (id: string) =>
    must(await admin.from("profiles").select("role, is_banned, banned_until").eq("id", id).single(), "profile");

  beforeAll(async () => {
    [member, other, mod, mod2, adminUser] = await Promise.all([
      createTestUser("mmember"),
      createTestUser("mother"),
      createTestUser("mmod", { role: "mod" }),
      createTestUser("mmod2", { role: "mod" }),
      createTestUser("madmin", { role: "admin" }),
    ]);
    categoryId = must(await admin.from("forum_categories").select("id").eq("slug", "general").single(), "cat").id;
    cleanupTasks.push(
      () => admin.from("threads").delete().in("id", threadIds),
      () =>
        admin
          .from("moderation_actions")
          .delete()
          .in("subject_id", [member.id, other.id, mod.id, mod2.id, adminUser.id]),
      () =>
        admin.from("moderation_actions").delete().in("actor_id", [member.id, other.id, mod.id, mod2.id, adminUser.id]),
    );
  });

  afterAll(cleanup);

  describe("bans (mod_ban_user / mod_unban_user)", () => {
    it("a mod bans a member for a while, with an audit row and a notification", async () => {
      const until = new Date(Date.now() + 86_400_000).toISOString();
      must(
        await mod.client.rpc("mod_ban_user", { p_user_id: other.id, p_until: until, p_reason: "Spam links" }),
        "ban",
      );
      const profile = await profileOf(other.id);
      expect(profile.is_banned).toBe(true);
      expect(new Date(profile.banned_until!).getTime()).toBe(new Date(until).getTime());

      const log = must(
        await admin.from("moderation_actions").select("*").eq("subject_id", other.id).eq("action", "ban"),
        "log",
      );
      expect(log[0]).toMatchObject({
        actor_id: mod.id,
        actor_type: "human",
        target_type: "profile",
        reason: "Spam links",
      });
      expect(log[0]!.excerpt).toMatch(/^Until /);
      const [notice] = await notificationsFor(other.id, "mod_action");
      expect((notice!.payload as { message: string }).message).toContain("suspended until");
    });

    it("the banned member can't post", async () => {
      const thread = await seedThread(member.id);
      const { error } = await other.client
        .from("posts")
        .insert({ thread_id: thread.id, author_id: other.id, body_md: "Still here?", status: "visible" });
      expect(error).not.toBeNull();
    });

    it("a mod lifts the ban", async () => {
      must(await mod.client.rpc("mod_unban_user", { p_user_id: other.id, p_reason: "Appeal accepted" }), "unban");
      expect(await profileOf(other.id)).toMatchObject({ is_banned: false, banned_until: null });
    });

    it("a ban needs a reason and an end in the future", async () => {
      const noReason = await mod.client.rpc("mod_ban_user", {
        p_user_id: other.id,
        p_until: PERMANENT,
        p_reason: "  ",
      });
      expect(noReason.error?.message).toContain("reason_required");
      const past = await mod.client.rpc("mod_ban_user", {
        p_user_id: other.id,
        p_until: new Date(Date.now() - 1000).toISOString(),
        p_reason: "x",
      });
      expect(past.error?.message).toContain("ban_end_in_past");
    });

    it("nobody bans themselves, an admin, or (unless admin) a mod", async () => {
      const self = await mod.client.rpc("mod_ban_user", { p_user_id: mod.id, p_until: PERMANENT, p_reason: "x" });
      expect(self.error?.message).toContain("cannot_ban_self");
      const anAdmin = await mod.client.rpc("mod_ban_user", {
        p_user_id: adminUser.id,
        p_until: PERMANENT,
        p_reason: "x",
      });
      expect(anAdmin.error?.message).toContain("cannot_ban_staff");
      const aMod = await mod.client.rpc("mod_ban_user", { p_user_id: mod2.id, p_until: PERMANENT, p_reason: "x" });
      expect(aMod.error?.message).toContain("cannot_ban_staff");
      expect((await profileOf(mod2.id)).is_banned).toBe(false);
    });

    it("an admin can ban a mod permanently", async () => {
      must(
        await adminUser.client.rpc("mod_ban_user", { p_user_id: mod2.id, p_until: PERMANENT, p_reason: "Abuse" }),
        "ban",
      );
      expect(await profileOf(mod2.id)).toMatchObject({ is_banned: true, banned_until: null });
      must(await adminUser.client.rpc("mod_unban_user", { p_user_id: mod2.id, p_reason: "" }), "unban");
    });

    it("members can't ban anyone", async () => {
      const { error } = await member.client.rpc("mod_ban_user", {
        p_user_id: other.id,
        p_until: PERMANENT,
        p_reason: "x",
      });
      expect(error?.message).toContain("not_allowed");
      const unban = await member.client.rpc("mod_unban_user", { p_user_id: other.id, p_reason: "x" });
      expect(unban.error?.message).toContain("not_allowed");
    });
  });

  describe("roles (admin_set_role)", () => {
    it("an admin promotes and demotes, and it's logged", async () => {
      must(await adminUser.client.rpc("admin_set_role", { p_user_id: member.id, p_role: "mod" }), "promote");
      expect((await profileOf(member.id)).role).toBe("mod");
      must(await adminUser.client.rpc("admin_set_role", { p_user_id: member.id, p_role: "user" }), "demote");
      expect((await profileOf(member.id)).role).toBe("user");
      const log = must(
        await admin.from("moderation_actions").select("reason").eq("subject_id", member.id).eq("action", "role_change"),
        "log",
      );
      expect(log.map((row) => row.reason)).toEqual(expect.arrayContaining(["user → mod", "mod → user"]));
    });

    it("mods and members can't change roles; admins can't change their own", async () => {
      const byMod = await mod.client.rpc("admin_set_role", { p_user_id: member.id, p_role: "mod" });
      expect(byMod.error?.message).toContain("not_allowed");
      const byMember = await member.client.rpc("admin_set_role", { p_user_id: member.id, p_role: "admin" });
      expect(byMember.error?.message).toContain("not_allowed");
      const own = await adminUser.client.rpc("admin_set_role", { p_user_id: adminUser.id, p_role: "user" });
      expect(own.error?.message).toContain("cannot_change_own_role");
      const bad = await adminUser.client.rpc("admin_set_role", { p_user_id: member.id, p_role: "owner" });
      expect(bad.error?.message).toContain("invalid_role");
    });
  });

  describe("mod tools under RLS", () => {
    it("a mod removes, restores, locks and moves a thread; the author hears about it", async () => {
      const thread = await seedThread(member.id);
      must(await mod.client.from("threads").update({ status: "removed" }).eq("id", thread.id), "remove");
      must(await mod.client.from("threads").update({ status: "open" }).eq("id", thread.id), "restore");
      must(await mod.client.from("threads").update({ status: "locked" }).eq("id", thread.id), "lock");
      const help = must(await admin.from("forum_categories").select("id").eq("slug", "help").single(), "help");
      must(await mod.client.from("threads").update({ category_id: help.id }).eq("id", thread.id), "move");
      const row = must(await admin.from("threads").select("status, category_id").eq("id", thread.id).single(), "row");
      expect(row).toEqual({ status: "locked", category_id: help.id });

      const messages = (await notificationsFor(member.id, "mod_action"))
        .filter((n) => (n.payload as { thread_id?: number }).thread_id === thread.id)
        .map((n) => (n.payload as { message: string }).message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^A moderator removed your thread/),
          expect.stringMatching(/was restored\.$/),
          expect.stringMatching(/^A moderator locked your thread/),
        ]),
      );
    });

    it("members can't remove, lock or move someone else's thread", async () => {
      const thread = await seedThread(member.id);
      await other.client.from("threads").update({ status: "removed" }).eq("id", thread.id);
      await member.client.from("threads").update({ status: "locked" }).eq("id", thread.id);
      expect(must(await admin.from("threads").select("status").eq("id", thread.id).single(), "row").status).toBe(
        "open",
      );
    });

    it("approving a held reply notifies like a new one, and tells its author", async () => {
      const thread = await seedThread(member.id);
      const postId = await seedPost(thread.id, other.id, "held");
      expect(
        must(await admin.from("threads").select("reply_count").eq("id", thread.id).single(), "t").reply_count,
      ).toBe(0);
      must(await mod.client.from("posts").update({ status: "visible" }).eq("id", postId), "approve");

      expect(
        must(await admin.from("threads").select("reply_count").eq("id", thread.id).single(), "t").reply_count,
      ).toBe(1);
      const replies = (await notificationsFor(member.id, "thread_reply")).filter(
        (n) => (n.payload as { post_id?: number }).post_id === postId,
      );
      expect(replies).toHaveLength(1);
      const approved = (await notificationsFor(other.id, "mod_action")).filter(
        (n) => (n.payload as { post_id?: number }).post_id === postId,
      );
      expect((approved[0]!.payload as { message: string }).message).toMatch(/^Your reply in .* was approved\.$/);
    });

    it("removing a reply notifies its author and stops counting it", async () => {
      const thread = await seedThread(member.id);
      const postId = await seedPost(thread.id, other.id);
      must(await mod.client.from("posts").update({ status: "removed" }).eq("id", postId), "remove");
      expect(
        must(await admin.from("threads").select("reply_count").eq("id", thread.id).single(), "t").reply_count,
      ).toBe(0);
      const removed = (await notificationsFor(other.id, "mod_action")).filter(
        (n) => (n.payload as { post_id?: number }).post_id === postId,
      );
      expect((removed[0]!.payload as { message: string }).message).toMatch(/^A moderator removed your reply/);
    });

    it("approving a held thread sends the mentions it skipped", async () => {
      seq += 1;
      const row = must(
        await admin
          .from("threads")
          .insert({
            category_id: categoryId,
            author_id: member.id,
            title: `E2E moderation rule ${runId} mention ${seq}`,
            slug: `mod-mention-${runId}-${seq}`,
            body_md: `Hey @${other.username}, does this happen to you too?`,
            status: "held",
          })
          .select("id")
          .single(),
        "held thread",
      );
      threadIds.push(row.id);
      const mentionsFor = async () =>
        (await notificationsFor(other.id, "mention")).filter(
          (n) => (n.payload as { thread_id?: number }).thread_id === row.id,
        );
      expect(await mentionsFor()).toHaveLength(0);
      must(await mod.client.from("threads").update({ status: "open" }).eq("id", row.id), "approve");
      expect(await mentionsFor()).toHaveLength(1);
    });

    it("mods resolve reports; members can't read them", async () => {
      must(
        await member.client
          .from("reports")
          .insert({ reporter_id: member.id, target_type: "profile", target_id: other.id, reason: "spam" }),
        "report",
      );
      // Members file reports but can't read them back.
      expect(must(await member.client.from("reports").select("id"), "member read")).toEqual([]);
      const open = must(
        await mod.client.from("reports").select("id").eq("reporter_id", member.id).eq("status", "open"),
        "open",
      );
      expect(open).toHaveLength(1);
      must(
        await mod.client
          .from("reports")
          .update({ status: "dismissed", resolved_by: mod.id, resolved_at: new Date().toISOString() })
          .eq("id", open[0]!.id),
        "resolve",
      );
      expect(must(await admin.from("reports").select("status").eq("id", open[0]!.id).single(), "r").status).toBe(
        "dismissed",
      );
      cleanupTasks.push(() => admin.from("reports").delete().eq("id", open[0]!.id));
    });

    it("mods log actions with the new subject and excerpt columns; members can't log", async () => {
      must(
        await mod.client.from("moderation_actions").insert({
          actor_id: mod.id,
          actor_type: "human",
          action: "post_remove",
          target_type: "post",
          target_id: "1",
          subject_id: other.id,
          excerpt: "Quoted text",
          labels: ["spam"],
        }),
        "mod log",
      );
      const byMember = await member.client.from("moderation_actions").insert({
        actor_id: member.id,
        actor_type: "human",
        action: "post_remove",
        target_type: "post",
        target_id: "1",
      });
      expect(byMember.error).not.toBeNull();
      const tooLong = await mod.client.from("moderation_actions").insert({
        actor_id: mod.id,
        actor_type: "human",
        action: "x",
        target_type: "post",
        target_id: "1",
        excerpt: "x".repeat(501),
      });
      expect(tooLong.error).not.toBeNull();
      const aiAsMod = await mod.client.from("moderation_actions").insert({
        actor_id: mod.id,
        actor_type: "ai",
        action: "ai_hold",
        target_type: "post",
        target_id: "1",
      });
      expect(aiAsMod.error).not.toBeNull();
    });
  });
});
