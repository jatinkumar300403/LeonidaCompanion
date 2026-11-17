import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("routes", () => {
  it("builds detail URLs and encodes segments", () => {
    expect(routes.tip("lose-wanted-level")).toBe("/tips/lose-wanted-level");
    expect(routes.thread(42, "how do i?")).toBe("/forum/t/42/how%20do%20i%3F");
    expect(routes.clip(7)).toBe("/clips/7");
    expect(routes.user("jason_d")).toBe("/u/jason_d");
  });

  it("adds query strings only when there is a value", () => {
    expect(routes.ask()).toBe("/ask");
    expect(routes.ask("What time does it unlock?")).toBe("/ask?q=What+time+does+it+unlock%3F");
    expect(routes.newThread("My title")).toBe("/forum/new?title=My+title");
    expect(routes.unanswered()).toBe("/forum?sort=unanswered");
  });
});
