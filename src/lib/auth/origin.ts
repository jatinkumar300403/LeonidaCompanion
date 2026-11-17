/**
 * The origin to put in auth redirect links (magic link, OAuth). Only hosts the site is known to
 * run on are trusted (NEXT_PUBLIC_SITE_HOSTS, localhost, the Vercel deployment host); anything
 * else, such as a spoofed Host header, falls back to the configured site URL. Pure and tested.
 */
export function trustedOrigin(
  headers: Pick<Headers, "get">,
  { siteUrl, siteHosts, vercelUrl }: { siteUrl: string; siteHosts: string[]; vercelUrl?: string },
): string {
  const rawHost = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0]?.trim().toLowerCase();
  if (!rawHost || !/^[a-z0-9.-]+(:\d{1,5})?$/.test(rawHost)) return siteUrl;

  const hostname = rawHost.replace(/:\d+$/, "");
  const trusted = new Set([...siteHosts, "localhost", "127.0.0.1"]);
  if (vercelUrl) trusted.add(vercelUrl.toLowerCase().replace(/:\d+$/, ""));
  if (!trusted.has(hostname)) return siteUrl;

  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : local ? "http" : "https";
  return `${proto}://${rawHost}`;
}
