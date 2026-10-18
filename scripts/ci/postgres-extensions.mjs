/**
 * Prepare vanilla Postgres for pvp_test migrations (pgcrypto in extensions schema).
 * Usage: TEST_DATABASE_URL=... node scripts/ci/postgres-extensions.mjs
 */
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL?.trim();
if (!url) {
  console.error("TEST_DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: url.includes("localhost") ? false : "require" });
try {
  await sql.unsafe(`
    CREATE SCHEMA IF NOT EXISTS extensions;
    CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
      END IF;
    END $$;
  `);
  console.log("postgres extensions ready");
} finally {
  await sql.end();
}
