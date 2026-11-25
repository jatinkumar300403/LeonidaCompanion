import { describe, expect, it } from "vitest";
import { prodGuardProblems, seedAdminSql, sqlLiteral } from "../../../scripts/lib/prod-env.mjs";

/** The PROD push guard (Phase 11, D-112): migrations + seed reach PROD only on purpose. */
const DEV = "abcdefghijklmnopqrst";
const PROD = "tsrqponmlkjihgfedcba";
const ok = {
  SUPABASE_PROJECT_REF_DEV: DEV,
  SUPABASE_PROJECT_REF_PROD: PROD,
  SUPABASE_ACCESS_TOKEN: "token",
  CONFIRM_PROD: PROD,
};

describe("prodGuardProblems", () => {
  it("accepts a confirmed PROD ref while the CLI stays linked to DEV", () => {
    expect(prodGuardProblems(ok, DEV)).toEqual([]);
    expect(prodGuardProblems(ok, null)).toEqual([]);
  });

  it("refuses without an explicit confirmation of the PROD ref", () => {
    expect(prodGuardProblems({ ...ok, CONFIRM_PROD: undefined }, DEV)).toHaveLength(1);
    expect(prodGuardProblems({ ...ok, CONFIRM_PROD: DEV }, DEV)).toHaveLength(1);
  });

  it("refuses a missing, malformed or DEV-equal PROD ref", () => {
    expect(prodGuardProblems({ ...ok, SUPABASE_PROJECT_REF_PROD: "", CONFIRM_PROD: "" }, DEV).length).toBeGreaterThan(
      0,
    );
    expect(
      prodGuardProblems({ ...ok, SUPABASE_PROJECT_REF_PROD: "PROD", CONFIRM_PROD: "PROD" }, DEV).length,
    ).toBeGreaterThan(0);
    expect(prodGuardProblems({ ...ok, SUPABASE_PROJECT_REF_PROD: DEV, CONFIRM_PROD: DEV }, DEV).length).toBeGreaterThan(
      0,
    );
  });

  it("refuses without an access token or when the CLI is linked elsewhere", () => {
    expect(prodGuardProblems({ ...ok, SUPABASE_ACCESS_TOKEN: " " }, DEV)).toHaveLength(1);
    expect(prodGuardProblems(ok, PROD)).toHaveLength(1);
  });
});

describe("seed admin SQL", () => {
  it("quotes the address as one literal", () => {
    expect(sqlLiteral("o'neil@example.com")).toBe("'o''neil@example.com'");
    expect(seedAdminSql("a'); drop table x; --@example.com")).toBe(
      "select public.set_seed_admin('a''); drop table x; --@example.com') as promoted;",
    );
  });
});
