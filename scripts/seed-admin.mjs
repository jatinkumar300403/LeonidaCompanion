#!/usr/bin/env node
/**
 * Makes SEED_ADMIN_EMAIL the site admin (SPEC §11 seed, D-041). Stores the address in
 * private.seed_admins through the service-role-only `set_seed_admin` function: the account is
 * promoted now if it has finished onboarding, otherwise as soon as its profile is created.
 */
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./lib/dev-env.mjs";

const env = loadDevEnv({ requireSecret: true });
const email = env.SEED_ADMIN_EMAIL?.trim();

if (!email || email === "you@example.com") {
  console.log("[seed-admin] SEED_ADMIN_EMAIL is not set to your sign-in address; skipping.");
  process.exit(0);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await admin.rpc("set_seed_admin", { p_email: email });
if (error) {
  console.error(`[seed-admin] failed: ${error.message}`);
  process.exit(1);
}
console.log(
  data
    ? "[seed-admin] SEED_ADMIN_EMAIL is an admin."
    : "[seed-admin] Saved. That account becomes admin when it finishes onboarding.",
);
