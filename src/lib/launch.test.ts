import { describe, expect, it } from "vitest";
import { getLaunchState, launchWindowUtc, parseLaunchAt, serverLaunchHint } from "./launch";

describe("getLaunchState", () => {
  const launch = new Date("2026-11-19T00:00:00Z");

  it("splits the remaining time into days, hours, minutes and seconds", () => {
    const now = new Date("2026-11-17T21:30:15Z");
    expect(getLaunchState(now, launch)).toEqual({ status: "upcoming", days: 1, hours: 2, minutes: 29, seconds: 45 });
  });

  it("rounds partial seconds up so the last second still shows 1", () => {
    expect(getLaunchState(new Date(launch.getTime() - 400), launch)).toEqual({
      status: "upcoming",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 1,
    });
  });

  it("is out exactly at launch and afterwards", () => {
    expect(getLaunchState(launch, launch)).toEqual({ status: "out" });
    expect(getLaunchState(new Date("2026-12-01T00:00:00Z"), launch)).toEqual({ status: "out" });
  });
});

describe("parseLaunchAt", () => {
  it("parses an offset-less date as local time", () => {
    const date = parseLaunchAt("2026-11-19T00:00:00");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(19);
    expect(date.getHours()).toBe(0);
  });

  it("throws on garbage", () => {
    expect(() => parseLaunchAt("soon")).toThrow();
  });
});

describe("launch window", () => {
  it("spans UTC+14 to UTC−12 around local midnight", () => {
    const { earliest, latest } = launchWindowUtc("2026-11-19T00:00:00");
    expect(new Date(earliest).toISOString()).toBe("2026-11-18T10:00:00.000Z");
    expect(new Date(latest).toISOString()).toBe("2026-11-19T12:00:00.000Z");
  });

  it("only commits to a state the server can know for every time zone", () => {
    expect(serverLaunchHint(Date.parse("2026-11-18T09:59:59Z"), "2026-11-19T00:00:00")).toBe("upcoming");
    expect(serverLaunchHint(Date.parse("2026-11-18T10:00:00Z"), "2026-11-19T00:00:00")).toBe("unknown");
    expect(serverLaunchHint(Date.parse("2026-11-19T11:59:59Z"), "2026-11-19T00:00:00")).toBe("unknown");
    expect(serverLaunchHint(Date.parse("2026-11-19T12:00:00Z"), "2026-11-19T00:00:00")).toBe("out");
  });

  it("rejects a launch date with an offset", () => {
    expect(() => launchWindowUtc("2026-11-19T00:00:00Z")).toThrow();
  });
});
