import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { parseOgParams } from "@/lib/seo/og";

const TAGLINE = "Unofficial GTA 6 guide";

/**
 * Bricolage Grotesque (the site's display face, OFL) subset to just the characters drawn, fetched
 * from Google Fonts as TrueType (next/og can't read woff2). On any failure or after 3 s the image
 * falls back to the default font rather than failing (D-096).
 */
async function loadDisplayFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, { signal: AbortSignal.timeout(3000) }).then((res) => (res.ok ? res.text() : ""));
    const fontUrl = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!fontUrl) return null;
    const font = await fetch(fontUrl, { signal: AbortSignal.timeout(3000) });
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * Dynamic OG images (SPEC §13): the dusk gradient, a section label, the title and the site name.
 * Original artwork only: no game art, logos or the Pricedown font (CLAUDE.md rule 2).
 */
export async function GET(request: NextRequest) {
  const { title, section } = parseOgParams(request.nextUrl.searchParams);
  const heading = title || siteConfig.tagline;
  const size = heading.length > 70 ? 56 : heading.length > 40 ? 66 : 76;
  const font = await loadDisplayFont(`${heading}${section}${siteConfig.name}${TAGLINE}`);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#0a0b10",
        color: "#f4f5f9",
        position: "relative",
        fontFamily: font ? "Bricolage Grotesque" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 12,
          background: "linear-gradient(135deg, #ff3d8b 0%, #ff9f43 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -140,
          bottom: -180,
          width: 560,
          height: 560,
          borderRadius: 9999,
          background: "linear-gradient(180deg, #ffb35c 0%, #ff3d8b 100%)",
          opacity: 0.35,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {section ? (
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 9999,
              background: "linear-gradient(135deg, #ff3d8b 0%, #ff9f43 100%)",
              color: "#0a0b10",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {section}
          </div>
        ) : null}
        <div style={{ display: "flex", fontSize: 28, color: "#9aa1b5" }}>{TAGLINE}</div>
      </div>
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>{heading}</div>
      <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700 }}>{siteConfig.name}</div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: "Bricolage Grotesque", data: font, weight: 800, style: "normal" }] : undefined,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
    },
  );
}
