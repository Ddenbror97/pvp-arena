/**
 * Isolated DB timing for _withdraw_basis_sync (server-side ms, not client RTT).
 * Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)]!;
}

d("withdraw basis sync bench", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await sql`select pvp_test._withdraw_basis_rebuild_full()`;
    const uid = randomUUID();
    const username = ("bench" + uid.replace(/-/g, "")).slice(0, 20);
    await sql`select pvp_test.ensure_profile(${username}, true)
      from (select set_config('test.uid', ${uid}, true)) c`;
    const avail = (
      await sql`select pvp_test._user_account(${uid}::uuid, 'user_available'::pvp_test.account_kind, 'USD', 'real') id`
    )[0].id as string;
    const ext = (
      await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`
    )[0].id as string;
    const txId = (
      await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
        values ('deposit'::pvp_test.tx_kind, ${randomUUID()}, 'real', ${uid}::uuid) returning id`
    )[0].id as string;
    await sql`select pvp_test._post(${txId}::uuid, ${ext}::uuid, ${-50000}::bigint)`;
    await sql`select pvp_test._post(${txId}::uuid, ${avail}::uuid, ${50000}::bigint)`;
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("reports p50/p95/p99 for sync under sequential and concurrent calls", async () => {
    const samples: number[] = [];
    for (let i = 0; i < 12; i++) {
      const [row] = await sql`
        select extract(epoch from (t1 - t0)) * 1000 as ms
        from (select clock_timestamp() as t0) a,
             (select pvp_test._withdraw_basis_sync(), clock_timestamp() as t1) b`;
      samples.push(Number(row.ms));
    }
    await Promise.all(
      Array.from({ length: 5 }, () => sql`select pvp_test._withdraw_basis_sync()`),
    );
    const [row] = await sql`
      select extract(epoch from (t1 - t0)) * 1000 as ms
      from (select clock_timestamp() as t0) a,
           (select pvp_test._withdraw_basis_sync(), clock_timestamp() as t1) b`;
    samples.push(Number(row.ms));
    samples.sort((a, b) => a - b);

    const p50 = pct(samples, 50);
    const p95 = pct(samples, 95);
    const p99 = pct(samples, 99);
    const max = samples[samples.length - 1] ?? 0;
    console.log(
      JSON.stringify({
        withdraw_basis_sync_bench: { n: samples.length, p50_ms: Math.round(p50), p95_ms: Math.round(p95), p99_ms: Math.round(p99), max_ms: Math.round(max) },
      }),
    );

    const limit = Number(process.env.WITHDRAW_BASIS_SYNC_P99_MS ?? "8000");
    expect(p99).toBeLessThan(limit);
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });
});
