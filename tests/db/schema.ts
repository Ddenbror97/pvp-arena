import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type postgres from "postgres";

/** Explicit BEGIN/COMMIT in migrations must stay on a reserved pool connection. */
export async function applyTestSchema(sql: postgres.Sql, skip: readonly string[] = []) {
  const connection = await sql.reserve();
  try {
    await connection.unsafe(buildTestSchemaSql(skip));
  } finally {
    connection.release();
  }
}

/**
 * Builds a copy of the production schema (every migration in order) inside
 * `pvp_test`. Callers must connect with TEST_DATABASE_URL on a separate
 * Postgres instance. The schema name alone does not isolate advisory locks
 * or the production primary. auth.uid() is replaced by a session setting so
 * tests can act as any user.
 */
export function buildTestSchemaSql(skip: readonly string[] = []): string {
  const dir = join(process.cwd(), "supabase/migrations");
  // 20260925125620 used an unqualified app_role type that doesn't port to the
  // isolated schema; 20260925125749 re-applies the identical fix portably.
  const superseded = new Set(["20260925125620_70751fb6-0f85-4e13-9c9f-4a2eeb379a5f.sql"]);
  const skipped = new Set(skip);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !superseded.has(f) && !skipped.has(f))
    .sort();
  // Historical pg_get_functiondef patches match literal LF snippets. Git's
  // Windows checkout must not change their semantics in the isolated fixture.
  let s = files.map((f) => readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n")).join("\n");
  s = s.replace(/create extension if not exists pgcrypto with schema extensions;/g, "");
  // The production audit index is built with CONCURRENTLY, which cannot run
  // inside this schema script. The isolated database uses a normal build.
  s = s.replace(/create index concurrently/gi, "create index");
  // pg_net is a Supabase HTTP extension. The migration only creates it; nothing
  // in the chain calls net.http_*. Vanilla Postgres has no control file for it.
  s = s.replace(/create extension if not exists pg_net;/gi, "");
  s = s.replace(/alter publication supabase_realtime[^;]*;/gi, "");
  // Realtime channel authorization lives in the shared realtime schema, not pvp_test.
  s = s.replace(/-- realtime-auth:begin[\s\S]*?-- realtime-auth:end/g, "");
  // Scheduler jobs are production-only.
  s = s.replace(/-- prod-only:begin[\s\S]*?-- prod-only:end/g, "");
  s = s.replace(/select public\._ensure_open_game\(\);/g, "");
  // One-off production data operations (live finalize + controlled credits)
  // must never replay into the isolated schema. The migration files also
  // return early when those historical deposits are absent, which is what a
  // fresh database push relies on. This strip stays so the test schema never
  // depends on that branch.
  s = s.replace(/DO \$\$\s*DECLARE r1 jsonb; r2 jsonb; inv jsonb;[\s\S]*?END \$\$;/g, "");
  s = s.replace(/DO \$\$\s*DECLARE r jsonb; s crypto_settings;[\s\S]*?END \$\$;/g, "");
  s = s.replace(
    /do \$\$ begin\s+if exists \(select 1 from pg_roles where rolname = 'sandbox_exec'\)[\s\S]*?end \$\$;/g,
    "",
  );
  s = s
    .replace(/public\./g, "pvp_test.")
    .replace(/\bsearch_path\s*=\s*public\b/gi, "search_path = pvp_test");
  // In-place function patch helpers look functions up by schema name.
  s = s.replace(/n\.nspname = 'public'/g, "n.nspname = 'pvp_test'");
  s = s.replace(/search_path to 'public'/gi, "search_path TO 'pvp_test'");
  s = s.replace(/in schema public/g, "in schema pvp_test");
  // Never overwrite the real match service's private Auth helper when a hosted
  // disposable project is used as the test database.
  s = s.replace(/fps_private/g, "pvp_test_fps_private");
  s = s.replace(/auth\.uid\(\)/g, "pvp_test.test_uid()");
  // Production applies each migration in its own transaction. This script
  // runs them together, and Postgres refuses a new enum value until commit.
  s = s.replace(/^(alter type\s+\S+\s+add value\s+[^;]+;)/gim, "$1\ncommit;");
  // The email-code sign-up helpers read auth.users, which the test role
  // cannot access; point them at a local stand-in table.
  s = s.replace(/auth\.users/g, "pvp_test.test_auth_users");
  s = s.replace(/auth\.sessions/g, "pvp_test.test_auth_sessions");
  // MAINTAIN is a Postgres 17 table privilege. Production runs 17. The isolated
  // database on some machines is 16, which rejects the word and never builds
  // the schema. Dropping it here does not restore the privilege in production.
  s = s.replace(/, maintain\b/gi, "");
  // 20261021195500 must end poker_table_state with a semicolon. Without it,
  // the next statement in that file is a syntax error and a fresh database
  // stops there. The replace still repairs a copy that is missing it.
  s = s.replace(/end \$fn\$(?!\s*;)/gi, "end $fn$;");
  return `drop schema if exists pvp_test cascade;
drop schema if exists pvp_test_fps_private cascade;
create schema pvp_test;
-- Supabase's API roles can resolve public objects; model that namespace access
-- so permission/RLS tests cannot pass merely because schema access was absent.
grant usage on schema pvp_test to anon, authenticated, service_role;
create table pvp_test.test_auth_users (id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz);
create table pvp_test.test_auth_sessions (id uuid primary key, user_id uuid not null, not_after timestamptz);
-- Stand-ins for auth.users and auth.sessions. They are not a client API.
-- RLS with no policies denies anon and authenticated. The table owner, the
-- isolated test role, keeps access and is what the SQL tests use.
alter table pvp_test.test_auth_users enable row level security;
alter table pvp_test.test_auth_sessions enable row level security;
revoke all on table pvp_test.test_auth_users from public;
revoke all on table pvp_test.test_auth_sessions from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table pvp_test.test_auth_users from anon';
    execute 'revoke all on table pvp_test.test_auth_sessions from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table pvp_test.test_auth_users from authenticated';
    execute 'revoke all on table pvp_test.test_auth_sessions from authenticated';
  end if;
end $$;
create function pvp_test.test_uid() returns uuid language sql stable set search_path = pvp_test as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
set search_path to pvp_test;
${s}`;
}
