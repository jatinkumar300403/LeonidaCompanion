import { describe, expect, it } from "vitest";
import { trustedOrigin } from "./origin";

const config = { siteUrl: "https://atlas.example", siteHosts: ["atlas.example", "www.atlas.example"] };
const h = (values: Record<string, string>) => new Headers(values);

describe("trustedOrigin", () => {
  it("uses localhost over http in development", () => {
    expect(trustedOrigin(h({ host: "localhost:3000" }), config)).toBe("http://localhost:3000");
  });

  it("uses a known production host over https", () => {
    expect(trustedOrigin(h({ host: "www.atlas.example", "x-forwarded-proto": "https" }), config)).toBe(
      "https://www.atlas.example",
    );
  });

  it("accepts the Vercel deployment host", () => {
    expect(
      trustedOrigin(h({ "x-forwarded-host": "atlas-git-x.vercel.app" }), {
        ...config,
        vercelUrl: "atlas-git-x.vercel.app",
      }),
    ).toBe("https://atlas-git-x.vercel.app");
  });

  it.each([
    ["an unknown host", { host: "evil.example" }],
    ["a malformed host", { host: "atlas.example/evil" }],
    ["no host", {}],
  ])("falls back to the site URL for %s", (_label, headers) => {
    expect(trustedOrigin(h(headers as Record<string, string>), config)).toBe("https://atlas.example");
  });
});
