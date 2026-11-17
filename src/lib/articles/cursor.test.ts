import { describe, expect, it } from "vitest";
import { cursorFilter, decodeCursor, encodeCursor, parseSort } from "./cursor";

const id = "0b9f8c1e-2d3a-4b5c-8d7e-1f2a3b4c5d6e";
const at = "2026-11-19T08:30:00+00:00";
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

describe("article cursors", () => {
  it("round-trips both sorts", () => {
    const latest = { sort: "latest", publishedAt: at, id } as const;
    expect(decodeCursor(encodeCursor(latest), "latest")).toEqual(latest);
    const helpful = { sort: "helpful", helpfulUp: 42, publishedAt: at, id } as const;
    expect(decodeCursor(encodeCursor(helpful), "helpful")).toEqual(helpful);
  });

  it("treats a cursor for the other sort, or garbage, as the first page", () => {
    const latest = encodeCursor({ sort: "latest", publishedAt: at, id });
    expect(decodeCursor(latest, "helpful")).toBeNull();
    expect(decodeCursor("not-base64-json", "latest")).toBeNull();
    expect(decodeCursor(encode(["l", "yesterday", "x"]), "latest")).toBeNull();
    expect(decodeCursor(encode(["l", at, "not-a-uuid"]), "latest")).toBeNull();
    expect(decodeCursor(encode(["h", -1, at, id]), "helpful")).toBeNull();
    expect(decodeCursor(encode(["h", 1.5, at, id]), "helpful")).toBeNull();
    expect(decodeCursor("x".repeat(500), "latest")).toBeNull();
    expect(decodeCursor(null, "latest")).toBeNull();
  });

  it("builds PostgREST keyset filters with quoted values", () => {
    expect(cursorFilter({ sort: "latest", publishedAt: at, id })).toBe(
      `published_at.lt."${at}",and(published_at.eq."${at}",id.lt."${id}")`,
    );
    const helpful = cursorFilter({ sort: "helpful", helpfulUp: 3, publishedAt: at, id });
    expect(helpful.startsWith("helpful_up.lt.3,")).toBe(true);
    expect(helpful).toContain(`and(helpful_up.eq.3,published_at.eq."${at}",id.lt."${id}")`);
  });

  it("parses the sort parameter", () => {
    expect(parseSort("helpful")).toBe("helpful");
    expect(parseSort("latest")).toBe("latest");
    expect(parseSort("anything")).toBe("latest");
    expect(parseSort(null)).toBe("latest");
  });
});
