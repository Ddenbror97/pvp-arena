import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import postgres from "postgres";

// Operates exclusively on the verified private archive and a NEW local database.
// Never connects to production or removes rows from the original backup.
const backup = JSON.parse(
  fs.readFileSync("test-results/remediation-production-backup.json", "utf8"),
);
assert.equal(backup.productionRef, "dkyabirifoixnfbmheay");
const archive = path.resolve(backup.dumpPath),
  root = path.resolve(".wrangler/production-backup-verification") + path.sep;
assert(archive.startsWith(root), "Unexpected private backup location");
assert.equal(
  createHash("sha256").update(fs.readFileSync(archive)).digest("hex"),
  backup.backupSha256,
  "Archive checksum mismatch",
);
const database = "fps_prod_recovery_" + randomBytes(4).toString("hex");
const url = "postgresql://postgres@127.0.0.1:55432/" + database;
const report = {
  started: new Date().toISOString(),
  scope: "Isolated recovery rehearsal only; source production and original archive unchanged",
  database,
  archiveSha256: backup.backupSha256,
  quarantineApproval:
    "PENDING: restored-only quarantine of pre-existing orphaned Auth MFA claims; never a clean unmodified restore",
};
const executable = "C:/Program Files/PostgreSQL/18/bin/pg_restore.exe";
async function restore(section) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
        "--section=" + section,
        "--dbname",
        url,
        archive,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (b) => (stderr += b));
    child.on("error", reject);
    child.on("exit", (code) =>
      code ? reject(Error("Restore " + section + " failed: " + stderr.slice(0, 1000))) : resolve(),
    );
  });
}
async function fingerprint(sql) {
  return (
    await sql`select
  (select count(*)::text from public.profiles) profiles,
  (select count(*)::text from auth.users) auth_users,
  (select count(*)::text from public.wallet_accounts) accounts,
  (select count(*)::text from public.ledger_transactions) transactions,
  (select count(*)::text from public.ledger_postings) postings,
  (select coalesce(sum(amount),0)::text from public.ledger_postings) posting_sum,
  (select coalesce(sum(balance),0)::text from public.wallet_accounts) balance_sum,
  (select md5(row_to_json(s)::text) from public.crypto_settings s) financial_settings_hash`
  )[0];
}
let sql;
try {
  const admin = postgres("postgresql://postgres@127.0.0.1:55432/postgres", {
    max: 1,
    onnotice: () => {},
  });
  await admin.unsafe(`create database ${database}`);
  await admin.end();
  sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  await sql.unsafe("set time zone 'UTC'");
  await sql.unsafe(
    "drop schema public cascade; create schema extensions; create extension pgcrypto schema extensions; create extension pg_trgm schema extensions;",
  );
  await restore("pre-data");
  await restore("data");
  report.authBefore = (
    await sql`select (select count(*)::int from auth.mfa_amr_claims) claims,(select count(*)::int from auth.sessions) sessions`
  )[0];
  await sql.begin(async (tx) => {
    await tx.unsafe(
      "create schema recovery_quarantine; revoke all on schema recovery_quarantine from public,anon,authenticated; create table recovery_quarantine.auth_mfa_amr_claims (like auth.mfa_amr_claims including all); revoke all on recovery_quarantine.auth_mfa_amr_claims from public,anon,authenticated;",
    );
    await tx`insert into recovery_quarantine.auth_mfa_amr_claims select c.* from auth.mfa_amr_claims c where not exists(select 1 from auth.sessions s where s.id=c.session_id)`;
    await tx`delete from auth.mfa_amr_claims c where not exists(select 1 from auth.sessions s where s.id=c.session_id)`;
  });
  report.quarantined = (
    await sql`select count(*)::int n from recovery_quarantine.auth_mfa_amr_claims`
  )[0].n;
  await restore("post-data");
  const [claims] =
    await sql`select (select count(*)::int from auth.mfa_amr_claims) active,(select count(*)::int from recovery_quarantine.auth_mfa_amr_claims) preserved`;
  assert.equal(
    claims.active + claims.preserved,
    report.authBefore.claims,
    "All original Auth claims must be retained",
  );
  assert.equal(
    (
      await sql`select count(*)::int n from auth.mfa_amr_claims c where not exists(select 1 from auth.sessions s where s.id=c.session_id)`
    )[0].n,
    0,
  );
  report.restored = await fingerprint(sql);
  assert.deepEqual(
    report.restored,
    backup.source,
    "Existing financial data, Auth users and settings must be unchanged",
  );
  report.beforeMigrationInvariants = (await sql`select public.money_real_invariants() r`)[0].r;
  for (const [k, v] of Object.entries(report.beforeMigrationInvariants))
    if (k.startsWith("ok_")) assert.equal(v, true, k);
  report.migrations = [];
  for (const migration of fs
    .readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql") && n.split("_")[0] > backup.sourceMigration)
    .sort()) {
    await sql.unsafe(
      fs.readFileSync(path.join("supabase/migrations", migration), "utf8").replace(/\r\n/g, "\n"),
    );
    report.migrations.push(migration);
  }
  report.afterMigration = await fingerprint(sql);
  assert.deepEqual(report.afterMigration, backup.source);
  report.cashControl = (
    await sql`select enabled,cash_enabled,practice_allowed from public.fps_config`
  )[0];
  assert.equal(report.cashControl.cash_enabled, false);
  report.afterMigrationInvariants = (await sql`select public.money_real_invariants() r`)[0].r;
  for (const [k, v] of Object.entries(report.afterMigrationInvariants))
    if (k.startsWith("ok_")) assert.equal(v, true, k);
  report.rehearsalPassed = true;
  report.unmodifiedRestorePassed = false;
  const approvalFile = "test-results/remediation-recovery-approval.json";
  if (fs.existsSync(approvalFile)) {
    const approval = JSON.parse(fs.readFileSync(approvalFile, "utf8"));
    if (
      approval.approved &&
      approval.archiveSha256 === report.archiveSha256 &&
      approval.orphanedClaims === report.quarantined
    )
      report.quarantineApproval =
        "APPROVED: exact archive and restored-copy orphan quarantine; source production unchanged";
  }
} catch (error) {
  report.rehearsalPassed = false;
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  await sql?.end({ timeout: 2 });
  report.finished = new Date().toISOString();
  fs.writeFileSync(
    "test-results/remediation-production-recovery.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      rehearsalPassed: report.rehearsalPassed,
      quarantined: report.quarantined,
      migrations: report.migrations?.length,
      failure: report.failure,
      approval: report.quarantineApproval,
    }),
  );
}
