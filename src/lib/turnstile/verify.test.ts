import { describe, expect, it, vi } from "vitest";
import { TURNSTILE_VERIFY_URL, verifyTurnstileToken } from "./verify";

const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)));

describe("verifyTurnstileToken", () => {
  it("skips the check when Turnstile isn't configured", async () => {
    const fetchImpl = reply({ success: true });
    await expect(verifyTurnstileToken({ secret: undefined, token: undefined, fetchImpl })).resolves.toEqual({
      ok: true,
      skipped: true,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires a token when configured", async () => {
    const result = await verifyTurnstileToken({ secret: "s", token: "", fetchImpl: reply({ success: true }) });
    expect(result.ok).toBe(false);
  });

  it("posts the secret, token and IP to Cloudflare and passes on success", async () => {
    const fetchImpl = reply({ success: true });
    const result = await verifyTurnstileToken({ secret: "s", token: "t", ip: "203.0.113.9", fetchImpl });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("s");
    expect(body.get("response")).toBe("t");
    expect(body.get("remoteip")).toBe("203.0.113.9");
  });

  it("fails on a rejected token or a network error", async () => {
    expect((await verifyTurnstileToken({ secret: "s", token: "t", fetchImpl: reply({ success: false }) })).ok).toBe(
      false,
    );
    const broken = vi.fn(async () => {
      throw new Error("offline");
    });
    expect((await verifyTurnstileToken({ secret: "s", token: "t", fetchImpl: broken })).ok).toBe(false);
  });
});
