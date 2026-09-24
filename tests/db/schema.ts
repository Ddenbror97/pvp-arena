import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Builds an isolated copy of the production schema (every migration in order)
 * inside the `pvp_test` schema so integration tests never touch live data.
 * auth.uid() is replaced by a session setting so tests can act as any user.
 */
export function buildTestSchemaSql(): string {
  const dir = join(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let s = files.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  s = s.replace(/create extension if not exists pgcrypto with schema extensions;/g, "");
  s = s.replace(/alter publication supabase_realtime[^;]*;/g, "");
  s = s.replace(/select public\._ensure_open_game\(\);/g, "");
  s = s.replace(/do \$\$ begin\s+if exists \(select 1 from pg_roles where rolname = 'sandbox_exec'\)[\s\S]*?end \$\$;/g, "");
  s = s.replace(/revoke execute on all functions in schema public from public, anon, authenticated;/g, "");
  s = s.replace(/public\./g, "pvp_test.").replace(/search_path = public/g, "search_path = pvp_test");
  s = s.replace(/in schema public/g, "in schema pvp_test");
  s = s.replace(/auth\.uid\(\)/g, "pvp_test.test_uid()");
  // The email-code sign-up helpers read auth.users, which the test role
  // cannot access; point them at a local stand-in table.
  s = s.replace(/auth\.users/g, "pvp_test.test_auth_users");
  return `drop schema if exists pvp_test cascade;
create schema pvp_test;
create table pvp_test.test_auth_users (id uuid primary key, email text, email_confirmed_at timestamptz);
create function pvp_test.test_uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
${s}`;
}
