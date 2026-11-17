/**
 * Helpers for the database tests (`pnpm test:db`), which run against the DEV project with
 * throwaway users (D-043). They refuse to run unless every setting points at DEV, and skip
 * cleanly when the keys are missing (CI).
 */
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { devEnvProblems } from "../../scripts/lib/dev-env.mjs";

const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const hasDevKeys = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.SUPABASE_SECRET_KEY &&
  process.env.SUPABASE_PROJECT_REF_DEV,
);

if (hasDevKeys) {
  const problems = devEnvProblems(process.env, { requireSecret: true }) as string[];
  if (problems.length > 0) throw new Error(`Refusing to run database tests: ${problems.join("; ")}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

export type Client = SupabaseClient<Database>;

/** Short id so usernames stay within 20 characters: "r" + 5 chars + "_" + label. */
export const runId = randomBytes(4).toString("hex").slice(0, 5);

export const admin: Client = hasDevKeys
  ? createClient<Database>(url, secretKey, { auth: noSession })
  : (null as unknown as Client);

export function anon(): Client {
  return createClient<Database>(url, publishableKey, { auth: noSession });
}

export type TestUser = { id: string; email: string; username: string; client: Client };

const createdUsers: string[] = [];
export const cleanupTasks: Array<() => PromiseLike<unknown>> = [];

/**
 * Creates a confirmed user (and profile unless `profile: false`) through the admin API, then signs
 * in with a random password to get a client that acts as them.
 */
export async function createTestUser(
  label: string,
  options: {
    role?: "user" | "mod" | "admin";
    banned?: boolean;
    profile?: boolean;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<TestUser> {
  const email = `rls-${runId}-${label}@example.com`;
  const username = `r${runId}_${label}`.slice(0, 20);
  const password = randomBytes(18).toString("base64url");

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: options.metadata,
  });
  if (error || !data.user) throw new Error(`createUser(${label}) failed: ${error?.message}`);
  createdUsers.push(data.user.id);

  if (options.profile !== false) {
    const now = new Date().toISOString();
    const insert = await admin.from("profiles").insert({
      id: data.user.id,
      username,
      age_confirmed_at: now,
      terms_accepted_at: now,
    });
    if (insert.error) throw new Error(`profile(${label}) failed: ${insert.error.message}`);
    if (options.role || options.banned) {
      const update = await admin
        .from("profiles")
        .update({ role: options.role ?? "user", is_banned: options.banned ?? false })
        .eq("id", data.user.id);
      if (update.error) throw new Error(`role(${label}) failed: ${update.error.message}`);
    }
  }

  const client = anon();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`signIn(${label}) failed: ${signIn.error.message}`);
  return { id: data.user.id, email, username, client };
}

/** Runs registered cleanups, then deletes every user this run created (profiles cascade). */
export async function cleanup(): Promise<void> {
  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch {
      // Best effort: `pnpm test:cleanup` sweeps anything left behind.
    }
  }
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
}

/** Read-only SQL through the Management API (catalog checks the REST API can't do). */
export async function sqlQuery<T = Record<string, unknown>>(query: string, readOnly = true): Promise<T[]> {
  const ref = process.env.SUPABASE_PROJECT_REF_DEV;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token) throw new Error("SUPABASE_PROJECT_REF_DEV and SUPABASE_ACCESS_TOKEN are needed.");
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  if (!response.ok) throw new Error(`Management API query failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as T[];
}

/** Throws when a Supabase call failed; returns its data otherwise (null only for writes without a select). */
export function must<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as NonNullable<T>;
}
