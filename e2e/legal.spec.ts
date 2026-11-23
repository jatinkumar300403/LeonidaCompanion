import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { adminClient, supabaseReady } from "./helpers/auth";

/**
 * Phase 9 content-removal form (SPEC §14, D-098). A visitor without an account sends a request
 * from a clip's removal link; it lands in `reports` as a `dmca` report about `clip:<id>`. The
 * e2e-…@example.com address skips Turnstile and the limits under `next dev` (D-046); the test
 * deletes its row, and `pnpm test:cleanup` sweeps any left behind.
 */
test.skip(!supabaseReady, "Needs the Supabase DEV keys in .env.local.");

test("a creator sends a removal request without an account", async ({ page }) => {
  const id = randomBytes(4).toString("hex");
  const email = `e2e-removal-${id}@example.com`;
  const clipId = 900_000_000 + Number.parseInt(id.slice(0, 6), 16);

  await page.goto(`/dmca?clip=${clipId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Content removal");
  const form = page.getByRole("form", { name: "Send a removal request" });

  // Nothing ticked yet: the form explains what's missing and keeps what was typed.
  await form.getByLabel("Your name").fill("E2E Creator");
  await form.getByRole("button", { name: "Send removal request" }).click();
  await expect(form.getByText("Please fix the highlighted fields.")).toBeVisible();
  await expect(form.getByText("Please confirm the statement.")).toBeVisible();
  await expect(form.getByLabel("Your name")).toHaveValue("E2E Creator");

  await form.getByLabel("Email address").fill(email);
  await form.getByLabel("Page on this site").fill(`http://localhost:3000/clips/${clipId}`);
  await form.getByLabel("I made it (it's my clip, video or writing)").check();
  await form
    .getByLabel("What is it, and why should it come down?")
    .fill(`This clip is from my channel (test ${id}). Please take it down.`);
  await form.getByLabel(/I confirm the information in this request is accurate/).check();
  await form.getByRole("button", { name: "Send removal request" }).click();
  await expect(page.getByText("Request received")).toBeVisible();

  const admin = adminClient();
  const { data, error } = await admin
    .from("reports")
    .select("id, target_type, target_id, reason, reporter_id, details, status")
    .eq("target_type", "dmca")
    .like("details", `%<${email}>%`);
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  const report = data![0]!;
  expect(report).toMatchObject({
    target_type: "dmca",
    target_id: "/clips/" + clipId,
    reason: "copyright",
    reporter_id: null,
    status: "open",
  });
  expect(report.details).toContain("Relationship: I made it");
  await admin.from("reports").delete().eq("id", report.id);
});

test("an unknown clip id just leaves the form blank", async ({ page }) => {
  await page.goto("/dmca?clip=999999999999");
  const form = page.getByRole("form", { name: "Send a removal request" });
  await expect(form.getByLabel("Page on this site")).toHaveValue("");
  await expect(form.getByText(/^Clip:/)).toHaveCount(0);
});
