import { afterEach, describe, expect, it, vi } from "vitest";
import { assertStaging, STAGING_REF } from "../scripts/fps/staging-lib.mjs";
import { buildTestSchemaSql } from "./db/schema";
afterEach(() => vi.unstubAllEnvs());
describe("staging isolation", () => {
  it("requires the exact Fresh API and database host/account", () => {
    vi.stubEnv("SUPABASE_PROJECT_ID", STAGING_REF);
    vi.stubEnv("SUPABASE_URL", `https://${STAGING_REF}.supabase.co`);
    vi.stubEnv(
      "FPS_STAGING_DATABASE_URL",
      `postgresql://postgres.${STAGING_REF}:test@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    );
    expect(assertStaging).not.toThrow();
    for (const url of [
      `postgresql://postgres.${STAGING_REF}:test@other.invalid/postgres`,
      `postgresql://postgres.production:test@aws-0-us-east-1.pooler.supabase.com/postgres`,
      `postgresql://postgres:test@db.${STAGING_REF}.supabase.co/other`,
    ]) {
      vi.stubEnv("FPS_STAGING_DATABASE_URL", url);
      expect(assertStaging).toThrow("Database is not");
    }
  });
  it("replays Auth helpers in the isolated test namespace only", () => {
    const sql = buildTestSchemaSql();
    expect(sql).toContain("pvp_test_fps_private.check_sessions");
    expect(sql).not.toMatch(/(?<!pvp_test_)fps_private\./);
    expect(sql).not.toMatch(/drop schema if exists fps_private/);
    expect(sql).not.toMatch(/create or replace function public\./);
  });
});
