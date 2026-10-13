/**
 * Database integration tests connect only through TEST_DATABASE_URL.
 * SUPABASE_DB_URL is the production primary. A missing or matching test URL
 * throws. There is no fallback.
 *
 * Topology: CI and local db tests → isolated Postgres. Production → app traffic.
 * pvp_test stays as the schema name inside that isolated database until the
 * suite is moved off the production instance. Do not point TEST_DATABASE_URL
 * at the production host, pooler user, or project ref.
 */

export type TestDatabaseEnv = {
  TEST_DATABASE_URL?: string | undefined;
  SUPABASE_DB_URL?: string | undefined;
  SUPABASE_URL?: string | undefined;
  SUPABASE_PROJECT_ID?: string | undefined;
};

const REFUSAL = "TEST_DATABASE_URL points at the production database. Refusing to start.";

export function resolveTestDatabaseUrl(env: TestDatabaseEnv): string {
  const raw = env.TEST_DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "TEST_DATABASE_URL is required for database integration tests. Refusing to use SUPABASE_DB_URL.",
    );
  }
  let test: URL;
  try {
    test = parseDbUrl(raw);
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid database URL. Refusing to start.");
  }
  const prodRaw = env.SUPABASE_DB_URL?.trim();
  if (prodRaw) {
    try {
      if (sameServer(test, parseDbUrl(prodRaw))) throw new Error(REFUSAL);
    } catch (e) {
      if (e instanceof Error && e.message === REFUSAL) throw e;
    }
  }
  const ref = projectRef(env);
  if (ref && urlMentions(test, ref)) throw new Error(REFUSAL);
  return raw.replace(":6543/", ":5432/");
}

export function testDatabaseUrl(): string {
  return resolveTestDatabaseUrl(process.env);
}

function parseDbUrl(raw: string): URL {
  return new URL(raw.replace(":6543/", ":5432/"));
}

function sameServer(test: URL, prod: URL): boolean {
  if (test.hostname.toLowerCase() === prod.hostname.toLowerCase()) return true;
  const tu = decodeURIComponent(test.username).toLowerCase();
  const pu = decodeURIComponent(prod.username).toLowerCase();
  return tu.length > 0 && tu === pu;
}

function projectRef(env: TestDatabaseEnv): string {
  const fromId = env.SUPABASE_PROJECT_ID?.trim().toLowerCase() ?? "";
  if (fromId.length >= 8) return fromId;
  const url = env.SUPABASE_URL?.trim();
  if (!url) return "";
  try {
    const host = new URL(url).hostname.toLowerCase();
    const ref = host.split(".")[0] ?? "";
    return ref.length >= 8 ? ref : "";
  } catch {
    return "";
  }
}

function urlMentions(url: URL, ref: string): boolean {
  const hay = `${decodeURIComponent(url.username)}.${url.hostname}${url.pathname}`.toLowerCase();
  return hay.includes(ref);
}
