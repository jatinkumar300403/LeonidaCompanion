#!/usr/bin/env node
/**
 * Removes test data from the DEV project (D-043, D-044): users with `rls-…@example.com` or
 * `e2e-…@example.com` addresses (their profiles, votes and notifications cascade) and the rows and
 * files the database tests create. Run with `pnpm test:cleanup`; Playwright runs it after E2E.
 */
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./lib/dev-env.mjs";

const env = loadDevEnv({ requireSecret: true });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_EMAIL = /^(rls|e2e)-[a-z0-9-]+@example\.com$/;

async function testUsers() {
  const users = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users.filter((user) => user.email && TEST_EMAIL.test(user.email)));
    if (data.users.length < 1000) break;
  }
  return users;
}

const users = await testUsers();

// Phase 6: audit rows about test users (AI rows have no actor) and reports they filed. Both
// columns are set to null when the user is deleted, so this runs first.
if (users.length > 0) {
  const ids = users.map((user) => user.id);
  for (let index = 0; index < ids.length; index += 200) {
    const batch = ids.slice(index, index + 200);
    for (const { error } of [
      await admin.from("moderation_actions").delete().in("subject_id", batch),
      await admin.from("reports").delete().in("reporter_id", batch),
    ]) {
      if (error) console.error(`[cleanup] ${error.message}`);
    }
  }
}

for (const user of users) {
  const { data: files } = await admin.storage.from("avatars").list(user.id, { limit: 100 });
  if (files?.length) await admin.storage.from("avatars").remove(files.map((file) => `${user.id}/${file.name}`));
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) console.error(`[cleanup] couldn't delete a test user: ${error.message}`);
}

const sweeps = [
  admin.from("threads").delete().like("slug", "rls-%"),
  admin.from("threads").delete().like("title", "RLS %"),
  admin.from("threads").delete().like("title", "E2E %"),
  admin.from("articles").delete().like("slug", "rls-%"),
  admin.from("articles").delete().like("title", "[E2E]%"),
  admin.from("newsletter_subscribers").delete().like("email", "e2e-%@example.com"),
  admin.from("clips").delete().like("external_id", "rls-%"),
  // Phase 5: E2E and visual-QA clips (submitters are set to null when test users are deleted).
  admin.from("clips").delete().like("external_id", "e2e%"),
  admin.from("clips").delete().like("title", "[E2E]%"),
  admin.from("clips").delete().like("title", "[QA]%"),
  ...(users.length > 0
    ? [
        admin
          .from("moderation_actions")
          .delete()
          .in(
            "actor_id",
            users.map((user) => user.id),
          ),
      ]
    : []),
  admin.from("ask_logs").delete().like("question", "rls %"),
  admin.from("ingest_runs").delete().like("source_id", "rls-%"),
  admin.from("knowledge_chunks").delete().like("source_ref", "rls-%"),
  admin.from("reports").delete().is("reporter_id", null).eq("reason", "spam").eq("target_type", "post"),
  // Phase 9: removal requests sent by the E2E tests (anonymous, from e2e-…@example.com addresses).
  admin.from("reports").delete().eq("target_type", "dmca").like("details", "%<e2e-%@example.com>%"),
];
for (const sweep of sweeps) {
  const { error } = await sweep;
  if (error) console.error(`[cleanup] ${error.message}`);
}

const { data: images } = await admin.storage.from("article-images").list("", { limit: 1000, search: "rls-" });
if (images?.length) await admin.storage.from("article-images").remove(images.map((file) => file.name));

console.log(`[cleanup] removed ${users.length} test user(s) and swept test rows.`);
