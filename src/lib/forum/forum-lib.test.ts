import { describe, expect, it } from "vitest";
import { forumErrorMessage } from "./errors";
import { threadExcerpt } from "./excerpt";
import { buildQuote } from "./quote";
import { REPUTATION, reputationTotal, voteChangeDelta, voteReputation } from "./reputation";
import { forumListHref, hasSortParam, pageOffset, parseForumListState, topWindowStart, unansweredCutoff } from "./sort";

describe("reputation calculator (SPEC §5)", () => {
  it("scores post votes +2 / −1 and vote changes as the difference", () => {
    expect(voteReputation(1)).toBe(2);
    expect(voteReputation(-1)).toBe(-1);
    expect(voteReputation(0)).toBe(0);
    expect(voteChangeDelta(0, 1)).toBe(2);
    expect(voteChangeDelta(1, -1)).toBe(-3);
    expect(voteChangeDelta(-1, 0)).toBe(1);
  });

  it("totals every SPEC event", () => {
    expect(
      reputationTotal({ acceptedAnswers: 2, postUpvotes: 5, postDownvotes: 3, approvedClips: 1, publishedUserTips: 1 }),
    ).toBe(2 * 10 + 5 * 2 - 3 + 5 + 15);
    expect(reputationTotal({})).toBe(0);
    expect(REPUTATION.acceptedAnswer).toBe(10);
  });
});

describe("forum list state", () => {
  it("parses sort, window and page with safe defaults", () => {
    expect(parseForumListState({})).toEqual({ sort: "hot", t: "week", page: 1 });
    expect(parseForumListState({ sort: "top", t: "day", page: "3" })).toEqual({ sort: "top", t: "day", page: 3 });
    expect(parseForumListState({ sort: "bogus", t: "year", page: "-2" })).toEqual({ sort: "hot", t: "week", page: 1 });
    expect(parseForumListState({ page: "9999" }).page).toBe(50);
    expect(parseForumListState({ sort: ["new", "top"] }).sort).toBe("new");
  });

  it("builds short links and keeps sort on the landing page", () => {
    expect(forumListHref("/forum/help", {})).toBe("/forum/help");
    expect(forumListHref("/forum/help", { sort: "top", t: "week" })).toBe("/forum/help?sort=top");
    expect(forumListHref("/forum/help", { sort: "top", t: "all", page: 2 })).toBe("/forum/help?sort=top&t=all&page=2");
    expect(forumListHref("/forum/help", { sort: "new", t: "day" })).toBe("/forum/help?sort=new");
    expect(forumListHref("/forum", { sort: "hot" }, true)).toBe("/forum?sort=hot");
    expect(hasSortParam({ sort: "unanswered" })).toBe(true);
    expect(hasSortParam({ sort: "nope" })).toBe(false);
  });

  it("computes windows, the unanswered cutoff and offsets", () => {
    const now = Date.parse("2026-11-19T12:00:00Z");
    expect(topWindowStart("day", now)).toBe("2026-11-18T12:00:00.000Z");
    expect(topWindowStart("week", now)).toBe("2026-11-12T12:00:00.000Z");
    expect(topWindowStart("all", now)).toBeNull();
    expect(unansweredCutoff(now)).toBe("2026-11-18T12:00:00.000Z");
    expect(pageOffset(1, 20)).toBe(0);
    expect(pageOffset(3, 20)).toBe(40);
  });
});

describe("threadExcerpt", () => {
  it("strips markdown and hides spoilers", () => {
    expect(threadExcerpt("**Bold** start ||the twist|| end")).toBe("Bold start [spoiler] end");
    expect(threadExcerpt("cut mid ||secret that never clo")).toBe("cut mid [spoiler]");
    expect(threadExcerpt(null)).toBe("");
  });

  it("cuts long text at a word", () => {
    const text = threadExcerpt("word ".repeat(100), 40);
    expect(text.length).toBeLessThanOrEqual(40);
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("buildQuote", () => {
  it("quotes with the author and drops nested quotes", () => {
    expect(buildQuote("sam", "> old quote\nMy answer\n\nSecond line")).toBe(
      "> **@sam** wrote:\n> My answer\n>\n> Second line\n\n",
    );
    expect(buildQuote(null, "Hi")).toBe("> **[deleted user]** wrote:\n> Hi\n\n");
  });

  it("closes a spoiler cut in half", () => {
    const quote = buildQuote("sam", `start ||${"secret ".repeat(100)}||`, 60);
    expect((quote.match(/\|\|/g) ?? []).length % 2).toBe(0);
  });
});

describe("forumErrorMessage", () => {
  it("maps trigger refusals and RLS errors", () => {
    expect(forumErrorMessage({ message: "new_account_thread_limit" })).toContain("3 threads a day");
    expect(forumErrorMessage({ message: "links_need_reputation" })).toContain("20 reputation");
    expect(forumErrorMessage({ message: "edit_window_closed" })).toContain("30 minutes");
    expect(forumErrorMessage({ message: 'new row violates row-level security policy for table "posts"' })).toContain(
      "can't post here",
    );
    expect(forumErrorMessage({ code: "XX000", message: "something else" })).toBeNull();
  });
});
