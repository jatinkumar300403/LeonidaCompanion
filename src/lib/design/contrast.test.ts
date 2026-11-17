import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { blend, contrastRatio, mix, parseHex, parseThemeTokens, type TokenMap } from "./contrast";

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;
/** Alpha of tinted badge/chip backgrounds (`bg-teal/12` etc.). Keep in sync with the components. */
const TINT_ALPHA = 0.12;

const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");
const themes = parseThemeTokens(css);

describe("contrast maths", () => {
  it("parses 3- and 6-digit hex", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("0a0B10")).toEqual({ r: 10, g: 11, b: 16 });
    expect(() => parseHex("#12")).toThrow();
  });

  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777", "#777")).toBe(1);
    expect(contrastRatio("#767676", "#fff")).toBeCloseTo(4.54, 2);
  });

  it("blends and mixes in sRGB", () => {
    expect(blend("#ffffff", "#000000", 0.5)).toEqual({ r: 128, g: 128, b: 128 });
    expect(mix("#000000", "#ffffff", 0)).toEqual({ r: 0, g: 0, b: 0 });
    expect(mix("#000000", "#ffffff", 1)).toEqual({ r: 255, g: 255, b: 255 });
  });
});

function expectRatio(
  fg: string | ReturnType<typeof parseHex>,
  bg: string | ReturnType<typeof parseHex>,
  min: number,
  label: string,
) {
  const ratio = contrastRatio(fg, bg);
  expect(ratio, `${label}: ${ratio.toFixed(2)}:1 (needs ${min}:1)`).toBeGreaterThanOrEqual(min);
}

const SURFACES = ["background", "surface", "surface-2", "card", "popover", "muted", "secondary"];
const TEXT_TOKENS = [
  "foreground",
  "muted-foreground",
  "pink-text",
  "orange-text",
  "teal-text",
  "violet-text",
  "destructive",
  "dusk-text-from",
  "dusk-text-to",
];
const ACCENTS = ["pink", "orange", "teal", "violet"] as const;

for (const [theme, t] of Object.entries(themes) as [string, TokenMap][]) {
  describe(`${theme} theme tokens (WCAG 2.2 AA)`, () => {
    it.each(TEXT_TOKENS.flatMap((fg) => SURFACES.map((bg) => [fg, bg])))("text --%s on --%s ≥ 4.5:1", (fg, bg) => {
      expectRatio(t[fg], t[bg], AA_TEXT, `${theme} ${fg} on ${bg}`);
    });

    it.each(ACCENTS.flatMap((accent) => ["background", "surface", "surface-2"].map((bg) => [accent, bg])))(
      "--%s-text on a %s tinted badge over --%s ≥ 4.5:1",
      (accent, bg) => {
        const tinted = blend(t[accent], t[bg], TINT_ALPHA);
        expectRatio(t[`${accent}-text`], tinted, AA_TEXT, `${theme} ${accent}-text on tinted ${bg}`);
      },
    );

    it.each(["background", "surface", "surface-2"])(
      "--destructive on a destructive tinted badge over --%s ≥ 4.5:1",
      (bg) => {
        const tinted = blend(t.destructive, t[bg], TINT_ALPHA);
        expectRatio(t.destructive, tinted, AA_TEXT, `${theme} destructive on tinted ${bg}`);
      },
    );

    it("label colour on the dusk gradient (sampled) ≥ 4.5:1", () => {
      for (const step of [0, 0.25, 0.5, 0.75, 1]) {
        expectRatio(t["on-accent"], mix(t["dusk-from"], t["dusk-to"], step), AA_TEXT, `${theme} on-accent at ${step}`);
      }
    });

    it.each(ACCENTS)("label colour on a solid --%s fill ≥ 4.5:1", (accent) => {
      expectRatio(t["on-accent"], t[accent], AA_TEXT, `${theme} on-accent on ${accent}`);
    });

    it.each([
      ["primary-foreground", "primary"],
      ["secondary-foreground", "secondary"],
      ["accent-foreground", "accent"],
      ["card-foreground", "card"],
      ["popover-foreground", "popover"],
      ["destructive-foreground", "destructive"],
    ])("--%s on --%s ≥ 4.5:1", (fg, bg) => {
      expectRatio(t[fg], t[bg], AA_TEXT, `${theme} ${fg} on ${bg}`);
    });

    it.each(["ring", "input"].flatMap((fg) => SURFACES.map((bg) => [fg, bg])))(
      "non-text --%s on --%s ≥ 3:1 (focus ring, field borders)",
      (fg, bg) => {
        expectRatio(t[fg], t[bg], AA_NON_TEXT, `${theme} ${fg} on ${bg}`);
      },
    );
  });
}
