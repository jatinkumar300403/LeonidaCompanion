/**
 * Guard for the one sanctioned PROD path (Phase 11, D-112): `pnpm db:push:prod` pushes migrations
 * and seed.sql to the PROD project and nothing else. The DEV guard (dev-env.mjs, D-040) keeps
 * refusing PROD; this file is the only place that accepts the PROD ref.
 */

const REF = /^[a-z]{20}$/;

/**
 * Reasons it isn't safe to push to PROD; empty when it is.
 * @param {Record<string, string | undefined>} env
 * @param {string | null} linkedRef supabase/.temp/project-ref, or null when the CLI isn't linked
 */
export function prodGuardProblems(env, linkedRef) {
  const problems = [];
  const devRef = env.SUPABASE_PROJECT_REF_DEV?.trim() ?? "";
  const prodRef = env.SUPABASE_PROJECT_REF_PROD?.trim() ?? "";
  const confirm = env.CONFIRM_PROD?.trim() ?? "";

  if (!REF.test(prodRef)) problems.push("SUPABASE_PROJECT_REF_PROD is missing or not a 20-letter project ref");
  if (!REF.test(devRef)) problems.push("SUPABASE_PROJECT_REF_DEV is missing or not a 20-letter project ref");
  if (prodRef && prodRef === devRef) problems.push("SUPABASE_PROJECT_REF_PROD equals SUPABASE_PROJECT_REF_DEV");
  if (!env.SUPABASE_ACCESS_TOKEN?.trim()) problems.push("SUPABASE_ACCESS_TOKEN is missing");
  if (confirm !== prodRef || !prodRef) problems.push("CONFIRM_PROD must be set to the PROD project ref for this run");
  if (linkedRef && devRef && linkedRef !== devRef) {
    problems.push("supabase/.temp/project-ref is not the DEV project (run pnpm db:link first)");
  }
  return problems;
}

/** A Postgres string literal (single quotes doubled), for the one SQL call below. */
export function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

/** The seed-admin call (D-041) run through the Management API after the push. */
export function seedAdminSql(email) {
  return `select public.set_seed_admin(${sqlLiteral(email)}) as promoted;`;
}
