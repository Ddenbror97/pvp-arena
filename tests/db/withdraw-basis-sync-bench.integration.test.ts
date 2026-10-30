/**
 * Isolated DB timing for _withdraw_basis_sync (server-side ms, not client RTT).
 * Requires TEST_DATABASE_URL.
 *
 * Committed ledger rows are applied by the deferred trigger. Sync itself returns
 * immediately when this transaction has nothing in pvp.wb_pending, so an empty
 * call is not the apply path. The bench times that fast path and a sync that
 * applies a deposit still pending in the same transaction.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { applyTestSchema } from "./schema";
import { creditUserDeposit, fundTestTreasury, migrateTestSchemaToReal } from "./money";
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
    await applyTestSchema(sql);
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await fundTestTreasury(sql);
    await sql`select pvp_test._withdraw_basis_rebuild_full()`;
    const uid = randomUUID();
    const username = ("bench" + uid.replace(/-/g, "")).slice(0, 20);
    await sql`select pvp_test.ensure_profile(${username}, true)
      from (select set_config('test.uid', ${uid}, true)) c`;
    await sql.begin(async (db) => {
      await creditUserDeposit(db, uid, 50_000);
    });
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("reports p50/p95/p99 for an empty sync and for a sync that applies a pending deposit", async () => {
    const uid = (
      await sql`select w.owner_id as id from pvp_test.wallet_accounts w
        where w.owner_id is not null and w.kind = 'user_available' and w.asset = 'USD'
          and w.account_type = 'real' and w.balance = 50000
        limit 1`
    )[0].id as string;
    const external = (
      await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`
    )[0].id as string;
    const available = (
      await sql`select pvp_test._user_account(${uid}::uuid, 'user_available', 'USD', 'real') id`
    )[0].id as string;

    const timeEmpty = async () => {
      const [row] = await sql`
        select extract(epoch from (t1 - t0)) * 1000 as ms
        from (select clock_timestamp() as t0) a,
             (select pvp_test._withdraw_basis_sync(), clock_timestamp() as t1) b`;
      return Number(row.ms);
    };
    const timeApply = async () =>
      sql.begin(async (db) => {
        const txId = randomUUID();
        await db`insert into pvp_test.ledger_transactions (id, kind, idempotency_key, account_type, user_id)
          values (${txId}::uuid, 'deposit'::pvp_test.tx_kind, ${"bench-" + txId}, 'real', ${uid}::uuid)`;
        await db`select pvp_test._post(${txId}::uuid, ${external}::uuid, ${-100}::bigint)`;
        await db`select pvp_test._post(${txId}::uuid, ${available}::uuid, ${100}::bigint)`;
        const [row] = await db`
          select pending, extract(epoch from (t1 - t0)) * 1000 as ms
          from (
            select clock_timestamp() as t0,
                   coalesce(current_setting('pvp.wb_pending', true), '') as pending
          ) a,
          lateral (select pvp_test._withdraw_basis_sync(), clock_timestamp() as t1) b`;
        return { ms: Number(row.ms), pending: String(row.pending) };
      });

    const empty: number[] = [];
    for (let i = 0; i < 12; i++) empty.push(await timeEmpty());
    const applied: number[] = [];
    for (let i = 0; i < 12; i++) {
      const sample = await timeApply();
      expect(sample.pending).toMatch(/[0-9a-f-]{36}/);
      applied.push(sample.ms);
    }
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        const sample = await timeApply();
        expect(sample.pending).toMatch(/[0-9a-f-]{36}/);
      }),
    );
    const last = await timeApply();
    expect(last.pending).toMatch(/[0-9a-f-]{36}/);
    applied.push(last.ms);

    const round3 = (n: number) => Math.round(n * 1000) / 1000;
    const summarize = (samples: number[]) => {
      const sorted = [...samples].sort((a, b) => a - b);
      return {
        n: sorted.length,
        p50_ms: round3(pct(sorted, 50)),
        p95_ms: round3(pct(sorted, 95)),
        p99_ms: round3(pct(sorted, 99)),
        max_ms: round3(sorted[sorted.length - 1] ?? 0),
      };
    };
    const emptyStats = summarize(empty);
    const appliedStats = summarize(applied);
    console.log(JSON.stringify({ withdraw_basis_sync_bench: { empty: emptyStats, applied: appliedStats } }));

    expect(emptyStats.p99_ms).toBeLessThan(1000);
    const limit = Number(process.env.WITHDRAW_BASIS_SYNC_P99_MS ?? "8000");
    expect(appliedStats.p99_ms).toBeLessThan(limit);
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });
});
