/**
 * WCAG 2.x contrast maths plus a tiny parser for the token blocks in src/app/globals.css.
 * Used by the design-token contrast test (D-007); no runtime code depends on it.
 */

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toRgb(color: Rgb | string): Rgb {
  return typeof color === "string" ? parseHex(color) : color;
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance as defined by WCAG 2.x. */
export function relativeLuminance(color: Rgb | string): number {
  const { r, g, b } = toRgb(color);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** Contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: Rgb | string, b: Rgb | string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** `fg` at `alpha` composited over an opaque `bg` (what the browser paints for e.g. `bg-teal/12`). */
export function blend(fg: Rgb | string, bg: Rgb | string, alpha: number): Rgb {
  const f = toRgb(fg);
  const b = toRgb(bg);
  return {
    r: Math.round(f.r * alpha + b.r * (1 - alpha)),
    g: Math.round(f.g * alpha + b.g * (1 - alpha)),
    b: Math.round(f.b * alpha + b.b * (1 - alpha)),
  };
}

/** Linear interpolation in sRGB, used to sample points along a CSS gradient. */
export function mix(a: Rgb | string, b: Rgb | string, t: number): Rgb {
  return blend(b, a, t);
}

export type TokenMap = Record<string, string>;

function parseDeclarations(body: string): TokenMap {
  const tokens: TokenMap = {};
  for (const match of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

function blockAfterMarker(css: string, marker: string): string {
  const start = css.indexOf(`/* @tokens ${marker}`);
  if (start === -1) throw new Error(`Token block "@tokens ${marker}" not found`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

function resolveVars(tokens: TokenMap): TokenMap {
  const resolved: TokenMap = {};
  const lookup = (name: string, depth = 0): string => {
    const value = tokens[name];
    if (value === undefined) throw new Error(`Unknown token --${name}`);
    const ref = /^var\(--([\w-]+)\)$/.exec(value);
    if (ref && depth < 10) return lookup(ref[1], depth + 1);
    return value;
  };
  for (const name of Object.keys(tokens)) resolved[name] = lookup(name);
  return resolved;
}

/**
 * Returns the effective tokens per theme. `:root, .dark` always matches <html>, so the light
 * theme is the dark block overridden by the `.light` block, exactly as the cascade applies them.
 */
export function parseThemeTokens(css: string): { dark: TokenMap; light: TokenMap } {
  const dark = parseDeclarations(blockAfterMarker(css, "dark"));
  const lightOverrides = parseDeclarations(blockAfterMarker(css, "light"));
  return {
    dark: resolveVars(dark),
    light: resolveVars({ ...dark, ...lightOverrides }),
  };
}
