// Runs one migration against the live database inside a transaction that is always
// rolled back, and reports how it changes every player's withdrawal basis.
import postgres from "postgres";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: dry-run-migration.mjs <file.sql>");
const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: "require", max: 1, onnotice: () => {} });

const snapshot = async (tx) => {
  await tx`select public._withdraw_basis_sync()`;
  const rows = await tx`
    select b.user_id, coalesce(p.username, '') as username, b.eligible::bigint as eligible, b.bonus::bigint as bonus
    from public.withdraw_basis_bucket b left join public.profiles p on p.id = b.user_id`;
  return new Map(rows.map((r) => [r.user_id, r]));
};

const applied = await sql`
  select version from supabase_migrations.schema_migrations where version >= '20261014000000' order by version`;
console.log("applied since 2026-10-14:", applied.map((r) => r.version).join(" "));

const ROLLBACK = new Error("dry run rollback");
let report;
try {
  await sql.begin(async (tx) => {
    await tx`set local lock_timeout = '5s'`;
    await tx`set local statement_timeout = '120s'`;
    const before = await snapshot(tx);
    const t0 = Date.now();
    await tx.unsafe(readFileSync(file, "utf8"));
    const ms = Date.now() - t0;
    const after = await snapshot(tx);
    await tx`select public._withdraw_basis_assert_rebuild_idempotent()`;
    const ok = true;
    const changed = [];
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const b = before.get(id) ?? { eligible: 0n, bonus: 0n };
      const a = after.get(id) ?? { eligible: 0n, bonus: 0n };
      const de = Number(a.eligible) - Number(b.eligible);
      const db = Number(a.bonus) - Number(b.bonus);
      if (de || db)
        changed.push({
          user: (after.get(id) ?? before.get(id)).username || id.slice(0, 8),
          eligible_before: Number(b.eligible),
          eligible_after: Number(a.eligible),
          bonus_before: Number(b.bonus),
          bonus_after: Number(a.bonus),
        });
    }
    report = { users: after.size, changed, migration_ms: ms, rebuild_idempotent: ok };
    throw ROLLBACK;
  });
} catch (e) {
  if (e !== ROLLBACK) throw e;
}
console.log(JSON.stringify(report, null, 2));
await sql.end();
