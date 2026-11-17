/**
 * IndexNow (SPEC §4): tell Bing/Yandex about a published or changed URL. Pure payload builder;
 * src/server/articles/pipeline.ts sends it when INDEXNOW_KEY is set.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_PATH = "/api/indexnow";

export type IndexNowPayload = { host: string; key: string; keyLocation: string; urlList: string[] };

export function buildIndexNowPayload(siteUrl: string, key: string, paths: readonly string[]): IndexNowPayload | null {
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return null;
  let base: URL;
  try {
    base = new URL(siteUrl);
  } catch {
    return null;
  }
  if (base.protocol !== "https:") return null;
  const urlList = [...new Set(paths)].map((path) => new URL(path, base).toString());
  if (urlList.length === 0) return null;
  return { host: base.host, key, keyLocation: new URL(INDEXNOW_KEY_PATH, base).toString(), urlList };
}
