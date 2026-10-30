import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import postgres from "postgres";

// Reconstructs ONLY an ignored operator workspace from actual remote history.
// No remote history repair, baseline rewrite, or production DDL is performed.
const ref = "dkyabirifoixnfbmheay";
const authorized = new URL(process.env.FPS_PRODUCTION_DATABASE_URL ?? "");
assert.equal(authorized.hostname, `db.${ref}.supabase.co`);
const pool = new URL(authorized);
pool.hostname = "aws-0-us-east-2.pooler.supabase.com";
pool.username = `postgres.${ref}`;
const sql = postgres(pool.toString(), {
  ssl: "require",
  max: 1,
  prepare: false,
  connect_timeout: 15,
  onnotice: () => {},
});
try {
  const history =
    await sql`select version,name,statements from supabase_migrations.schema_migrations order by version`;
  assert.equal(
    history.at(-1).version,
    "20261029180000",
    "Production baseline changed; review before continuing",
  );
  const root = path.resolve(".wrangler/fps-production-release-cli"),
    supabase = path.join(root, "supabase");
  fs.mkdirSync(path.join(supabase, "migrations"), { recursive: true });
  fs.mkdirSync(path.join(supabase, ".temp"), { recursive: true });
  fs.writeFileSync(path.join(supabase, "config.toml"), `project_id = "${ref}"\n`);
  for (const file of fs.readdirSync(".wrangler/fps-production-cli/supabase/.temp")) {
    const source = path.join(".wrangler/fps-production-cli/supabase/.temp", file);
    if (fs.statSync(source).isFile()) fs.copyFileSync(source, path.join(supabase, ".temp", file));
  }
  const local = fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"));
  const localVersions = new Set(local.map((f) => f.split("_")[0]));
  const manifest = [];
  for (const row of history) {
    assert(/^\d{14}$/.test(row.version), "Invalid recorded migration version");
    const body = Array.isArray(row.statements) ? row.statements.join(";\n") : "";
    fs.writeFileSync(
      path.join(supabase, "migrations", row.version + "_recorded_remote_history.sql"),
      body || "-- Already-applied remote history entry; no statement body was retained.\n",
    );
    manifest.push({
      version: row.version,
      missingFromCheckout: !localVersions.has(row.version),
      recordedSqlSha256: createHash("sha256").update(body).digest("hex"),
    });
  }
  const pending = local.filter((f) => f.split("_")[0] > history.at(-1).version).sort();
  assert.deepEqual(pending, [
    "20261029192715_fps_ledger_matchmaking.sql",
    "20261029192803_fps_ledger_rpcs.sql",
    "20261030123754_fps_ledger_fk_indexes.sql",
    "20261030152706_fps_live_session_authorization.sql",
    "20261030165225_poker_seat_action_version.sql",
  ]);
  for (const file of pending)
    fs.writeFileSync(
      path.join(supabase, "migrations", file),
      fs.readFileSync(path.join("supabase/migrations", file), "utf8").replace(/\r\n/g, "\n"),
    );
  const linked = fs.readFileSync(path.join(supabase, ".temp/project-ref"), "utf8").trim();
  const pooler = new URL(fs.readFileSync(path.join(supabase, ".temp/pooler-url"), "utf8").trim());
  assert.equal(linked, ref);
  assert.equal(decodeURIComponent(pooler.username), `postgres.${ref}`);
  fs.writeFileSync(
    "test-results/remediation-production-migration-plan.json",
    JSON.stringify(
      {
        project: ref,
        root,
        baseline: history.at(-1).version,
        recordedHistoryEntries: history.length,
        missingFromCheckout: manifest.filter((m) => m.missingFromCheckout),
        pending,
        historyChanged: false,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      project: ref,
      recordedHistoryEntries: history.length,
      missingFromCheckout: manifest.filter((m) => m.missingFromCheckout).length,
      pending,
      historyChanged: false,
    }),
  );
} finally {
  await sql.end({ timeout: 2 });
}
