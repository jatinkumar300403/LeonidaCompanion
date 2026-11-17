import { describe, expect, it } from "vitest";
import { indexHref, parseIndexState } from "./index-url";

describe("section index URLs", () => {
  it("defaults to spoiler-free, latest, first page, no tag", () => {
    expect(parseIndexState({})).toEqual({ tag: null, spoilerFree: true, sort: "latest", cursor: null });
  });

  it("reads known values and ignores unknown ones", () => {
    expect(parseIndexState({ tag: "money", spoilers: "1", sort: "helpful", cursor: "abc" })).toEqual({
      tag: "money",
      spoilerFree: false,
      sort: "helpful",
      cursor: "abc",
    });
    expect(parseIndexState({ tag: "not-a-tag", sort: "random", cursor: "x".repeat(300) })).toEqual({
      tag: null,
      spoilerFree: true,
      sort: "latest",
      cursor: null,
    });
    expect(parseIndexState({ tag: ["driving", "money"] }).tag).toBe("driving");
  });

  it("builds short links that leave defaults out", () => {
    expect(indexHref("/tips", {})).toBe("/tips");
    expect(indexHref("/tips", { tag: "money", spoilerFree: true, sort: "latest" })).toBe("/tips?tag=money");
    expect(indexHref("/tips", { spoilerFree: false, sort: "helpful", cursor: "c1" })).toBe(
      "/tips?spoilers=1&sort=helpful&cursor=c1",
    );
  });
});
