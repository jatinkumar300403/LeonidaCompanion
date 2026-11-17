import "server-only";
import sharp from "sharp";

/** Cover uploads: what the browser may send, and what we store (SPEC §11: images only, ≤ 5 MB). */
export const COVER_INPUT_MAX_BYTES = 15 * 1024 * 1024;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_MAX_WIDTH = 1600;
const ACCEPTED_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/avif"]);

export class CoverError extends Error {}

/**
 * Re-encodes a cover image (D-045 pattern): checks it is really an image, applies EXIF rotation,
 * strips metadata, caps the width at 1600 px and writes WebP. Never stores the uploaded bytes.
 */
export async function processCoverImage(file: { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new CoverError("Use a JPEG, PNG, WebP or AVIF image.");
  if (file.size === 0 || file.size > COVER_INPUT_MAX_BYTES) throw new CoverError("The image must be under 15 MB.");
  try {
    const output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: COVER_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    if (output.byteLength > COVER_MAX_BYTES) throw new CoverError("The image is too large even after compression.");
    return output;
  } catch (error) {
    if (error instanceof CoverError) throw error;
    throw new CoverError("That file isn't an image we can read.");
  }
}
