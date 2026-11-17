import "server-only";
import sharp from "sharp";

export const AVATAR_SIZE = 512;
/** SPEC §9: stored avatars are at most 2 MB (the bucket enforces it too). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

export class AvatarError extends Error {}

/**
 * Re-encodes an avatar the browser already cropped (D-045): checks it really is an image, squares
 * it to 512 px, strips metadata (EXIF location and the like) and writes WebP. Never trusts the
 * browser's bytes as-is.
 */
export async function processAvatar(file: { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new AvatarError("Use a JPEG, PNG or WebP image.");
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) throw new AvatarError("The image must be under 2 MB.");

  try {
    const output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
    if (output.byteLength > AVATAR_MAX_BYTES) throw new AvatarError("The image must be under 2 MB.");
    return output;
  } catch (error) {
    if (error instanceof AvatarError) throw error;
    throw new AvatarError("That file isn't an image we can read.");
  }
}

/** The storage path of an avatar URL in our bucket, if it is one (for removing the old file). */
export function avatarPathFromUrl(url: string | null, supabaseUrl: string | undefined): string | null {
  if (!url || !supabaseUrl) return null;
  const prefix = `${supabaseUrl}/storage/v1/object/public/avatars/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0] ?? "");
  return /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/.test(path) ? path : null;
}
