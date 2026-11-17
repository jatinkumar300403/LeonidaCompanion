import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { parseOgParams } from "@/lib/seo/og";

/**
 * Dynamic OG images (SPEC §13): the dusk gradient, a section label, the title and the site name.
 * Original artwork only: no game art, logos or the Pricedown font (CLAUDE.md rule 2).
 */
export async function GET(request: NextRequest) {
  const { title, section } = parseOgParams(request.nextUrl.searchParams);
  const heading = title || siteConfig.tagline;
  const size = heading.length > 70 ? 56 : heading.length > 40 ? 66 : 76;

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
        <div style={{ display: "flex", fontSize: 28, color: "#9aa1b5" }}>Unofficial GTA 6 guide</div>
      </div>
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>{heading}</div>
      <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700 }}>{siteConfig.name}</div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
    },
  );
}
