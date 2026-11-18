import { describe, expect, it } from "vitest";
import { describeNotification, threadHref } from "./format";

const base = { id: 7, read_at: null, created_at: "2026-11-19T00:00:00Z" };
const forum = { thread_id: 12, thread_slug: "where-is-x", thread_title: "Where is X?", post_id: 40, actor: "sam" };

describe("describeNotification", () => {
  it("describes forum notifications and links to the post", () => {
    expect(describeNotification({ ...base, type: "thread_reply", payload: forum })).toEqual({
      id: 7,
      text: "@sam replied to your thread “Where is X?”",
      href: "/forum/t/12/where-is-x#post-40",
      unread: true,
      createdAt: base.created_at,
    });
    expect(describeNotification({ ...base, type: "post_reply", payload: forum }).text).toBe(
      "@sam replied to your post in “Where is X?”",
    );
    expect(describeNotification({ ...base, type: "mention", payload: forum }).text).toBe(
      "@sam mentioned you in “Where is X?”",
    );
    expect(describeNotification({ ...base, type: "answer_accepted", payload: forum }).text).toBe(
      "Your answer was accepted in “Where is X?”",
    );
  });

  it("copes with old or odd payloads", () => {
    const view = describeNotification({ ...base, read_at: "2026-11-19T01:00:00Z", type: "mention", payload: null });
    expect(view).toMatchObject({ text: "Someone mentioned you in a thread", href: null, unread: false });
    expect(describeNotification({ ...base, type: "mention", payload: { thread_id: 3 } }).href).toBe(
      "/forum/t/3/thread",
    );
    expect(describeNotification({ ...base, type: "admin_alert", payload: { message: "Hi" } }).text).toBe("Hi");
    expect(describeNotification({ ...base, type: "clip_approved", payload: { clip_id: 5 } }).href).toBe("/clips/5");
  });

  it("builds thread links", () => {
    expect(threadHref(1, "a b")).toBe("/forum/t/1/a%20b");
    expect(threadHref(1, null, 9)).toBe("/forum/t/1/thread#post-9");
  });
});
