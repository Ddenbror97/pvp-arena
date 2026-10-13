import { describe, expect, it } from "vitest";
import { resolveTestDatabaseUrl } from "./test-url";

const prod =
  "postgresql://postgres.abcdefghijklmnop:secret@aws-0.pooler.supabase.com:6543/postgres";
const isolated = "postgresql://postgres:secret@127.0.0.1:6543/pvp";

describe("resolveTestDatabaseUrl", () => {
  it("refuses to start when TEST_DATABASE_URL is missing", () => {
    expect(() => resolveTestDatabaseUrl({ SUPABASE_DB_URL: prod })).toThrow(
      /TEST_DATABASE_URL is required/,
    );
  });

  it("refuses when the test URL is the production URL", () => {
    expect(() =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: prod, SUPABASE_DB_URL: prod }),
    ).toThrow(/production database/);
  });

  it("refuses when only the port differs", () => {
    const direct = prod.replace(":6543/", ":5432/");
    expect(() =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: direct, SUPABASE_DB_URL: prod }),
    ).toThrow(/production database/);
  });

  it("refuses when the host differs but the database user matches", () => {
    const prodUser = "postgresql://app_owner:secret@db.example.com:5432/postgres";
    const otherHost = "postgresql://app_owner:secret@10.1.1.1:5432/postgres";
    expect(() =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: otherHost, SUPABASE_DB_URL: prodUser }),
    ).toThrow(/production database/);
  });

  it("refuses when the host differs but the project ref matches", () => {
    const sameProject =
      "postgresql://postgres:secret@db.abcdefghijklmnop.supabase.co:5432/postgres";
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: sameProject,
        SUPABASE_DB_URL: prod,
        SUPABASE_PROJECT_ID: "abcdefghijklmnop",
      }),
    ).toThrow(/production database/);
  });

  it("returns the direct port for an isolated server", () => {
    expect(
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: isolated,
        SUPABASE_DB_URL: prod,
        SUPABASE_PROJECT_ID: "abcdefghijklmnop",
      }),
    ).toBe(isolated.replace(":6543/", ":5432/"));
  });

  it("does not include the connection string in the error", () => {
    try {
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: prod, SUPABASE_DB_URL: prod });
      expect.unreachable();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      expect(message).not.toContain("secret");
      expect(message).not.toContain("pooler");
      expect(message).not.toContain("postgresql://");
    }
  });
});
