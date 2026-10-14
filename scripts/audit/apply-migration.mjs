// Applies one migration file to the live database inside a single transaction
// and records it in supabase_migrations.schema_migrations.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2];
if (!file) throw new Error("usage: apply-migration.mjs <file.sql>");
const base = basename(file, ".sql");
const split = base.indexOf("_");
const version = split > 0 ? base.slice(0, split) : "";
const name = split > 0 ? base.slice(split + 1) : "";
if (!/^\d{14}$/.test(version) || !name) {
  throw new Error("migration file must be <14-digit-version>_<name>.sql");
}
const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: "require", max: 1, onnotice: () => {} });
await sql.begin(async (tx) => {
  await tx.unsafe(readFileSync(file, "utf8"));
  await tx`
    insert into supabase_migrations.schema_migrations (version, name)
    values (${version}, ${name})
    on conflict (version) do nothing`;
});
console.log("applied", file);
await sql.end();
