import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import postgres from "postgres";

const productionRef = "dkyabirifoixnfbmheay";
const input = new URL(process.env.FPS_PRODUCTION_DATABASE_URL ?? "");
const validDirect =
  input.hostname === `db.${productionRef}.supabase.co` &&
  decodeURIComponent(input.username) === "postgres";
const validPool =
  input.hostname === "aws-0-us-east-2.pooler.supabase.com" &&
  decodeURIComponent(input.username) === `postgres.${productionRef}`;
assert(validDirect || validPool, "Refusing an unexpected production backup target");
assert(
  input.pathname === "/postgres" && ["postgres:", "postgresql:"].includes(input.protocol),
  "Invalid backup database",
);
assert(
  input.password && !/YOUR[-_ ]?PASSWORD/i.test(decodeURIComponent(input.password)),
  "A real production database password is required",
);
const directory = path.resolve(".wrangler/production-backup-verification");
fs.mkdirSync(directory, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dump = path.join(directory, stamp + ".dump");
const localDatabase = "fps_prod_restore_" + randomBytes(4).toString("hex");
const localUrl = `postgresql://postgres@127.0.0.1:55432/${localDatabase}`;
const report = {
  started: new Date().toISOString(),
  productionRef,
  scope: "Read-only production snapshot; isolated localhost:55432 restore and migration rehearsal",
  localDatabase,
  dumpPath: dump,
  privilegeLimitation:
    "Logical restore uses no-owner/no-privileges; hosted role ACLs, secrets and control-plane recovery require independent verification.",
};
const executable = (name) => {
  for (const version of [18, 17]) {
    const file = `C:/Program Files/PostgreSQL/${version}/bin/${name}.exe`;
    if (fs.existsSync(file)) return file;
  }
  return name;
};
async function run(name, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable(name), args, { env, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (bytes) => (stderr += bytes));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, stderr }));
  });
}
async function fingerprint(sql) {
  const [row] = await sql`select
    (select count(*)::text from public.profiles) profiles,
    (select count(*)::text from auth.users) auth_users,
    (select count(*)::text from public.wallet_accounts) accounts,
    (select count(*)::text from public.ledger_transactions) transactions,
    (select count(*)::text from public.ledger_postings) postings,
    (select coalesce(sum(amount),0)::text from public.ledger_postings) posting_sum,
    (select coalesce(sum(balance),0)::text from public.wallet_accounts) balance_sum,
    (select md5(row_to_json(s)::text) from public.crypto_settings s) financial_settings_hash`;
  return row;
}
let source, restored;
try {
  let sourceUrl = input.toString();
  source = postgres(sourceUrl, {
    ssl: "require",
    max: 1,
    prepare: false,
    connect_timeout: 15,
    onnotice: () => {},
  });
  try {
    await source`select 1`;
  } catch {
    await source.end({ timeout: 1 });
    if (!validDirect) throw Error("Production backup connection failed");
    const pool = new URL(sourceUrl);
    pool.hostname = "aws-0-us-east-2.pooler.supabase.com";
    pool.username = `postgres.${productionRef}`;
    sourceUrl = pool.toString();
    source = postgres(sourceUrl, {
      ssl: "require",
      max: 1,
      prepare: false,
      connect_timeout: 15,
      onnotice: () => {},
    });
    await source`select 1`;
    report.connection = "Authorized production session pooler fallback";
  }
  const connection = new URL(sourceUrl),
    password = decodeURIComponent(connection.password);
  connection.password = "";
  await source.begin("isolation level repeatable read read only", async (tx) => {
    const [snapshot] = await tx`select pg_export_snapshot() id`;
    report.source = await fingerprint(tx);
    report.sourceMigration = (
      await tx`select max(version) version from supabase_migrations.schema_migrations`
    )[0].version;
    const namespaces =
      await tx`select nspname from pg_namespace where nspname in('public','auth','fps_private') order by nspname`;
    report.schemas = namespaces.map((n) => n.nspname);
    const dumped = await run(
      "pg_dump",
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        ...report.schemas.map((n) => "--schema=" + n),
        "--snapshot=" + snapshot.id,
        "--file",
        dump,
        "--dbname",
        connection.toString(),
      ],
      {
        ...process.env,
        PGPASSWORD: password,
        PGCONNECT_TIMEOUT: "15",
        PGSSLMODE: "require",
        PGOPTIONS: "-c lock_timeout=5000 -c statement_timeout=120000",
      },
    );
    if (dumped.code !== 0)
      throw Error(
        "Production logical backup failed: " +
          dumped.stderr.replaceAll(password, "[redacted]").slice(0, 1200),
      );
  });
  report.backupSha256 = createHash("sha256").update(fs.readFileSync(dump)).digest("hex");
  report.backupBytes = fs.statSync(dump).size;
  await source.end();
  source = undefined;
  const admin = postgres("postgresql://postgres@127.0.0.1:55432/postgres", {
    max: 1,
    onnotice: () => {},
  });
  await admin.unsafe(`create database ${localDatabase}`);
  await admin.end();
  restored = postgres(localUrl, { max: 1, prepare: false, onnotice: () => {} });
  await restored.unsafe("set time zone 'UTC'");
  await restored.unsafe(
    "drop schema public cascade; create schema extensions; create extension pgcrypto schema extensions; create extension pg_trgm schema extensions;",
  );
  const restore = await run("pg_restore", [
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    localUrl,
    dump,
  ]);
  if (restore.code !== 0)
    throw Error("Isolated production restore failed: " + restore.stderr.slice(0, 1500));
  report.restored = await fingerprint(restored);
  assert.deepEqual(
    report.restored,
    report.source,
    "Restored financial/Auth counts and settings must match the exported snapshot",
  );
  report.restoredInvariants = (await restored`select public.money_real_invariants() r`)[0].r;
  for (const [k, v] of Object.entries(report.restoredInvariants))
    if (k.startsWith("ok_")) assert.equal(v, true, k);
  const migrations = fs
    .readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql") && n.split("_")[0] > report.sourceMigration)
    .sort();
  for (const migration of migrations) {
    await restored.unsafe(
      fs.readFileSync(path.join("supabase/migrations", migration), "utf8").replace(/\r\n/g, "\n"),
    );
  }
  report.rehearsedMigrations = migrations;
  report.afterMigration = await fingerprint(restored);
  assert.deepEqual(
    report.afterMigration,
    report.source,
    "Candidate migrations must preserve all existing financial data and settings",
  );
  report.cashControl = (
    await restored`select enabled,cash_enabled,practice_allowed from public.fps_config where id=1`
  )[0];
  assert.equal(report.cashControl.cash_enabled, false);
  report.afterMigrationInvariants = (await restored`select public.money_real_invariants() r`)[0].r;
  for (const [k, v] of Object.entries(report.afterMigrationInvariants))
    if (k.startsWith("ok_")) assert.equal(v, true, k);
  report.passed = true;
} catch (error) {
  report.passed = false;
  // Driver messages can contain connection parameters. Keep public evidence sanitized.
  report.failure = String(error.message)
    .replaceAll(decodeURIComponent(input.password), "[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[database URL redacted]");
  process.exitCode = 1;
} finally {
  await source?.end({ timeout: 2 });
  await restored?.end({ timeout: 2 });
  report.finished = new Date().toISOString();
  fs.writeFileSync(
    "test-results/remediation-production-backup.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      backupBytes: report.backupBytes,
      sourceMigration: report.sourceMigration,
      rehearsedMigrations: report.rehearsedMigrations?.length,
      failure: report.failure,
    }),
  );
}
