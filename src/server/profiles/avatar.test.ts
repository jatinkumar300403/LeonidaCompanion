import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { AvatarError, avatarPathFromUrl, processAvatar } from "./avatar";

const asFile = (buffer: Buffer, type: string) => ({
  type,
  size: buffer.byteLength,
  arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
});

describe("processAvatar", () => {
  it("re-encodes an image as a 512 px WebP square", async () => {
    const png = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#ff3d8b" } })
      .png()
      .toBuffer();
    const output = await processAvatar(asFile(png, "image/png"));
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
    expect(meta.exif).toBeUndefined();
  });

  it("rejects other types, empty and oversized files, and non-images", async () => {
    await expect(processAvatar(asFile(Buffer.from("gif"), "image/gif"))).rejects.toBeInstanceOf(AvatarError);
    await expect(processAvatar(asFile(Buffer.alloc(0), "image/png"))).rejects.toThrow(/under 2 MB/);
    await expect(
      processAvatar({ type: "image/png", size: 3_000_000, arrayBuffer: async () => new ArrayBuffer(1) }),
    ).rejects.toThrow(/under 2 MB/);
    await expect(processAvatar(asFile(Buffer.from("not an image at all"), "image/png"))).rejects.toThrow(
      /isn't an image/,
    );
  });
});

describe("avatarPathFromUrl", () => {
  const base = "https://abc.supabase.co";
  const id = "0b7c6f9e-1d2a-4c8e-9f00-123456789abc";

  it("finds our own avatar files", () => {
    expect(avatarPathFromUrl(`${base}/storage/v1/object/public/avatars/${id}/a1.webp?v=2`, base)).toBe(`${id}/a1.webp`);
  });

  it("ignores other URLs and odd paths", () => {
    expect(avatarPathFromUrl("https://example.com/a.webp", base)).toBeNull();
    expect(avatarPathFromUrl(`${base}/storage/v1/object/public/avatars/../x`, base)).toBeNull();
    expect(avatarPathFromUrl(null, base)).toBeNull();
  });
});
