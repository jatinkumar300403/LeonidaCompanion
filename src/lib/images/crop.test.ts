import { describe, expect, it } from "vitest";
import { clampCrop, cropRect, panBy } from "./crop";

describe("cropRect", () => {
  it("centres the largest square at zoom 1", () => {
    expect(cropRect(1200, 800, { zoom: 1, panX: 0, panY: 0 })).toEqual({ sx: 200, sy: 0, size: 800 });
    expect(cropRect(600, 900, { zoom: 1, panX: 0, panY: 0 })).toEqual({ sx: 0, sy: 150, size: 600 });
  });

  it("pans to the edges", () => {
    expect(cropRect(1200, 800, { zoom: 1, panX: -1, panY: 0 }).sx).toBe(0);
    expect(cropRect(1200, 800, { zoom: 1, panX: 1, panY: 0 }).sx).toBe(400);
  });

  it("zooms into a smaller square that stays inside the image", () => {
    const rect = cropRect(1000, 1000, { zoom: 2, panX: 1, panY: -1 });
    expect(rect).toEqual({ sx: 500, sy: 0, size: 500 });
    expect(rect.sx + rect.size).toBeLessThanOrEqual(1000);
  });
});

describe("clampCrop", () => {
  it("keeps zoom and pan in range and replaces NaN", () => {
    expect(clampCrop({ zoom: 9, panX: -3, panY: Number.NaN })).toEqual({ zoom: 4, panX: -1, panY: 0 });
    expect(clampCrop({ zoom: 0.2, panX: 0.5, panY: 2 })).toEqual({ zoom: 1, panX: 0.5, panY: 1 });
  });
});

describe("panBy", () => {
  it("moves the crop opposite to the drag, within bounds", () => {
    const start = { zoom: 1, panX: 0, panY: 0 };
    const moved = panBy(1200, 800, start, 50, 0, 200);
    expect(moved.panX).toBeLessThan(0);
    expect(panBy(1200, 800, start, -10_000, 0, 200).panX).toBe(1);
  });

  it("can't pan along an axis with no room", () => {
    expect(panBy(1200, 800, { zoom: 1, panX: 0, panY: 0 }, 0, 40, 200).panY).toBe(0);
  });
});
