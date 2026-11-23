/**
 * Renders the favicon set from src/app/icon.svg (the original logo mark) with Playwright's
 * Chromium, so no image library is needed:
 *   - src/app/favicon.ico   16, 32 and 48 px PNGs in an ICO container
 *   - src/app/apple-icon.png  180 px, mark on the dark background (iOS ignores transparency)
 *   - public/icons/icon-{192,512}.png      PWA "any" icons: the mark on transparent (D-095)
 *   - public/icons/maskable-{192,512}.png  PWA maskable icons: the mark inside the 80% safe zone
 *     on the dark background, so launchers can crop them to any shape
 * Only the original mark and its dusk gradient appear: no game art or logos (CLAUDE.md rule 2).
 * Run with `pnpm gen:icons` after changing the mark, then commit the outputs.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const appDir = fileURLToPath(new URL("../src/app/", import.meta.url));
const iconsDir = fileURLToPath(new URL("../public/icons/", import.meta.url));
const svg = readFileSync(`${appDir}icon.svg`, "utf8");
const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

async function render(size: number, options: { background?: string; inset?: number } = {}): Promise<Buffer> {
  const { background = "transparent", inset = 0 } = options;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const markSize = size - inset * 2;
    await page.setContent(
      `<html><body style="margin:0;width:${size}px;height:${size}px;background:${background};display:grid;place-items:center">` +
        `<img src="${svgDataUrl}" width="${markSize}" height="${markSize}" alt=""></body></html>`,
    );
    await page.waitForFunction(() => document.images[0]?.complete);
    return await page.screenshot({
      omitBackground: background === "transparent",
      clip: { x: 0, y: 0, width: size, height: size },
    });
  } finally {
    await browser.close();
  }
}

/** ICO container holding PNG images (supported by every current browser and OS). */
function toIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) images.push({ size, png: await render(size) });
writeFileSync(`${appDir}favicon.ico`, toIco(images));
writeFileSync(`${appDir}apple-icon.png`, await render(180, { background: "#0a0b10", inset: 22 }));
console.log("Wrote src/app/favicon.ico (16/32/48) and src/app/apple-icon.png (180)");

mkdirSync(iconsDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`${iconsDir}icon-${size}.png`, await render(size, { inset: Math.round(size * 0.04) }));
  // Maskable: the mark spans 60% of the canvas, well inside the 80% safe-zone circle.
  writeFileSync(
    `${iconsDir}maskable-${size}.png`,
    await render(size, { background: "#0a0b10", inset: Math.round(size * 0.2) }),
  );
}
console.log("Wrote public/icons/icon-{192,512}.png and public/icons/maskable-{192,512}.png");
