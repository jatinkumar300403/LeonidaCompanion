import { describe, expect, it } from "vitest";
import { nextVote } from "./vote-buttons";

describe("nextVote", () => {
  it("sets, switches and clears a vote", () => {
    expect(nextVote(0, 1)).toBe(1);
    expect(nextVote(1, 1)).toBe(0);
    expect(nextVote(1, -1)).toBe(-1);
    expect(nextVote(-1, -1)).toBe(0);
    expect(nextVote(-1, 1)).toBe(1);
  });
});
