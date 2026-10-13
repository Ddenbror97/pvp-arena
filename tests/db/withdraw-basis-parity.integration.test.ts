/**
 * Incremental withdraw_basis cache must match a full ledger replay.
 * Requires TEST_DATABASE_URL (isolated Postgres).
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { fundTestTreasury, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

d("withdraw basis incremental parity", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await fundTestTreasury(sql);
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  async function user(name: string) {
    const id = randomUUID();
    const username = (name + id.replace(/-/g, "")).slice(0, 20);
    await sql`select pvp_test.ensure_profile(${username}, true)
      from (select set_config('test.uid', ${id}, true)) c`;
    return id;
  }

  async function deposit(uid: string, cents: number) {
    const avail = (
      await sql`select pvp_test._user_account(${uid}::uuid, 'user_available'::pvp_test.account_kind, 'USD', 'real') id`
    )[0].id as string;
    const ext = (
      await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`
    )[0].id as string;
    await sql.begin(async (db) => {
      const id = (
        await db`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
          values ('deposit'::pvp_test.tx_kind, ${randomUUID()}, 'real', ${uid}::uuid) returning id`
      )[0].id as string;
      await db`select pvp_test._post(${id}::uuid, ${ext}::uuid, ${-cents}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${avail}::uuid, ${cents}::bigint)`;
    });
  }

  it("fast path: sync is a no-op when cache is current", async () => {
    await sql`select pvp_test._withdraw_basis_rebuild_full()`;
    await sql`select pvp_test._withdraw_basis_sync()`;
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });

  it("incremental catch-up matches full rebuild after new postings", async () => {
    const u = await user("inc");
    await deposit(u, 2500);
    await sql`select pvp_test._withdraw_basis_sync()`;
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
    await deposit(u, 500);
    await sql`select pvp_test._withdraw_basis_sync()`;
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });

  it("concurrent sync calls leave one consistent snapshot", async () => {
    const u = await user("race");
    await deposit(u, 3000);
    await Promise.all([
      sql`select pvp_test._withdraw_basis_sync()`,
      sql`select pvp_test._withdraw_basis_sync()`,
      sql`select pvp_test._withdraw_basis_sync()`,
    ]);
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
    const room = (
      await sql`select (pvp_test._withdraw_basis(${u}::uuid)->>'room')::bigint r`
    )[0].r;
    expect(Number(room)).toBeGreaterThanOrEqual(3000);
  });

  it("recovers when an earlier-timestamp tx commits after sync applied a later one", async () => {
    if (!url) return;
    const late = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
    const uLate = await user("late");
    const uNow = await user("now");
    await sql`select pvp_test._withdraw_basis_rebuild_full()`;

    const availLate = (
      await sql`select pvp_test._user_account(${uLate}::uuid, 'user_available'::pvp_test.account_kind, 'USD', 'real') id`
    )[0].id as string;
    const ext = (
      await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`
    )[0].id as string;

    await late.unsafe("begin");
    try {
      const earlyId = (
        await late`insert into pvp_test.ledger_transactions
          (kind, idempotency_key, account_type, user_id, created_at)
          values (
            'deposit'::pvp_test.tx_kind,
            ${randomUUID()},
            'real',
            ${uLate}::uuid,
            clock_timestamp() - interval '2 hours'
          )
          returning id`
      )[0].id as string;
      await late`select pvp_test._post(${earlyId}::uuid, ${ext}::uuid, ${-1500}::bigint)`;
      await late`select pvp_test._post(${earlyId}::uuid, ${availLate}::uuid, ${1500}::bigint)`;

      await deposit(uNow, 2000);
      await sql`select pvp_test._withdraw_basis_sync()`;

      await late.unsafe("commit");
    } catch (e) {
      await late.unsafe("rollback");
      throw e;
    } finally {
      await late.end();
    }

    await sql`select pvp_test._withdraw_basis_sync()`;
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
    const lateRoom = (
      await sql`select (pvp_test._withdraw_basis(${uLate}::uuid)->>'room')::bigint r`
    )[0].r;
    expect(Number(lateRoom)).toBe(1500);
  });

  it("sync latency stays bounded under repeated and concurrent calls (isolated DB)", async () => {
    const u = await user("lat");
    await deposit(u, 50_000);
    const samples: number[] = [];
    for (let i = 0; i < 12; i++) {
      const [row] = await sql`
        select extract(epoch from (t1 - t0)) * 1000 as ms
        from (select clock_timestamp() as t0) a,
             (select pvp_test._withdraw_basis_sync(), clock_timestamp() as t1) b`;
      samples.push(Number(row.ms));
    }
    await Promise.all([
      sql`select pvp_test._withdraw_basis_sync()`,
      sql`select pvp_test._withdraw_basis_sync()`,
      sql`select pvp_test._withdraw_basis_sync()`,
    ]);
    const [row] = await sql`
      select extract(epoch from (t1 - t0)) * 1000 as ms
      from (select clock_timestamp() as t0) a,
           (select pvp_test._withdraw_basis_sync(), clock_timestamp() as t1) b`;
    samples.push(Number(row.ms));
    samples.sort((a, b) => a - b);
    const p99 = samples[Math.max(0, Math.ceil(0.99 * samples.length) - 1)] ?? 0;
    const p95 = samples[Math.max(0, Math.ceil(0.95 * samples.length) - 1)] ?? 0;
    // CI isolated Postgres; not a production SLO — catches multi-second regressions.
    expect(p95).toBeLessThan(8000);
    expect(p99).toBeLessThan(12_000);
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });
});
