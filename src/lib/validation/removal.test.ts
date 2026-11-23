import { describe, expect, it } from "vitest";
import { removalRequestEmail } from "@/emails/removal-request";
import {
  formatRemovalDetails,
  parseRemovalForm,
  removalFieldErrors,
  removalRequestSchema,
  removalTargetId,
  type RemovalRequest,
} from "./removal";

const valid = {
  name: "Dusk Streams",
  email: "Creator@Example.com",
  url: "https://example.com/clips/42",
  role: "creator",
  description: "This is a clip from my channel and I'd rather it wasn't featured.",
  statement: true,
};

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("removal request validation (SPEC §14)", () => {
  it("accepts a complete request and normalises the email", () => {
    const parsed = removalRequestSchema.parse(valid);
    expect(parsed.email).toBe("creator@example.com");
    expect(parsed.clipId).toBeUndefined();
  });

  it("requires the good-faith statement", () => {
    const result = removalRequestSchema.safeParse({ ...valid, statement: false });
    expect(result.success).toBe(false);
    expect(removalFieldErrors(result.error!)).toEqual({ statement: "Please confirm the statement." });
  });

  it("refuses non-http addresses and missing fields", () => {
    const result = removalRequestSchema.safeParse({
      ...valid,
      url: "javascript:alert(1)",
      name: "",
      role: "boss",
      description: "short",
    });
    expect(result.success).toBe(false);
    expect(Object.keys(removalFieldErrors(result.error!)).sort()).toEqual(["description", "name", "role", "url"]);
  });

  it("reads the form: ticked box, empty clip id, clip id", () => {
    const base = { ...valid, statement: "on" };
    const ok = parseRemovalForm(form({ ...base, clipId: "" }));
    expect(ok.success && ok.data.clipId).toBeUndefined();
    const withClip = parseRemovalForm(form({ ...base, clipId: "42" }));
    expect(withClip.success && withClip.data.clipId).toBe(42);
    const unticked = parseRemovalForm(form({ ...valid, statement: "" }));
    expect(unticked.success).toBe(false);
  });
});

describe("removal request storage", () => {
  const request = removalRequestSchema.parse(valid) as RemovalRequest;
  const hosts = ["example.com", "www.example.com"];

  it("points at the clip when it came from a clip page", () => {
    expect(removalTargetId({ ...request, clipId: 42 }, hosts)).toBe("clip:42");
  });

  it("uses the path for our own pages and the full address otherwise", () => {
    expect(removalTargetId({ url: "https://www.example.com/tips/x?a=1", clipId: undefined }, hosts)).toBe(
      "/tips/x?a=1",
    );
    expect(removalTargetId({ url: "http://localhost:3000/forum", clipId: undefined }, hosts)).toBe("/forum");
    expect(removalTargetId({ url: "https://elsewhere.test/page", clipId: undefined }, hosts)).toBe(
      "https://elsewhere.test/page",
    );
    expect(
      removalTargetId({ url: `https://elsewhere.test/${"a".repeat(400)}`, clipId: undefined }, hosts),
    ).toHaveLength(200);
  });

  it("formats details that always fit the reports column", () => {
    const details = formatRemovalDetails(request);
    expect(details).toContain("Removal request from Dusk Streams <creator@example.com>");
    expect(details).toContain("Relationship: I made it");
    expect(details).toContain("Page: https://example.com/clips/42");
    expect(details.endsWith(request.description)).toBe(true);
    const long = formatRemovalDetails({ ...request, description: "x".repeat(1500), name: "n".repeat(100) });
    expect(long.length).toBeLessThanOrEqual(2000);
  });

  it("emails the admin with everything escaped", () => {
    const email = removalRequestEmail({
      siteName: "Atlas",
      details: 'Removal request from <script>alert("x")</script>',
      target: "clip:42",
      queueUrl: "https://example.com/admin/moderation?tab=reports",
    });
    expect(email.subject).toBe("New removal request: clip:42");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("https://example.com/admin/moderation?tab=reports");
    expect(email.text).toContain('<script>alert("x")</script>');
  });
});
