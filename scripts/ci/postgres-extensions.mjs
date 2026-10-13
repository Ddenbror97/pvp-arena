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
  `);
  console.log("postgres extensions ready");
} finally {
  await sql.end();
}
