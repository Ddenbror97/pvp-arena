/**
 * Many pool matches at once, on the isolated schema only.
 * TEST_DATABASE_URL refuses the production database. Nothing here connects
 * to a hosted project.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { applyTestSchema } from "./schema";
import { testDatabaseUrl } from "./test-url";
import { freshTable } from "../../src/lib/pool/rules";
import { bytesFromHex } from "../../src/lib/pool/verify";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 24, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

async function as<T>(uid: string, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

async function newUser(name: string) {
  const id = randomUUID();
  const username = name.replace(/[^A-Za-z0-9_]/g, "").slice(0, 20);
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${username}, true)`);
  return id;
}

async function matchmake(uid: string, stake = 100) {
  const started = performance.now();
  try {
    const row = await as(uid, async (tx) => {
      const [found] = await tx`select pvp_test.pool_matchmake(${stake}, ${randomUUID()}) r`;
      return found.r as { match_id: number; role: string; duplicate: boolean };
    });
    return { ok: true as const, ms: performance.now() - started, ...row };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false as const, ms: performance.now() - started, message };
  }
}

async function joinOpen(uid: string, matchId: number) {
  const started = performance.now();
  try {
    const row = await as(uid, async (tx) => {
      const [found] = await tx`select pvp_test.pool_join(${matchId}, ${randomUUID()}) r`;
      return found.r as { match_id: number; role: string; duplicate: boolean };
    });
    return { ok: true as const, ms: performance.now() - started, ...row };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false as const, ms: performance.now() - started, message };
  }
}

function percentile(samples: number[], p: number) {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

async function books() {
  const [row] = await sql`select coalesce(sum(balance), 0)::bigint s from pvp_test.wallet_accounts`;
  return Number(row.s);
}

async function assertClosed(ids: number[]) {
  const matches = await sql`
    select id, status, creator_id, opponent_id, winner_id, stake, fee_amount, payout_amount
    from pvp_test.pool_matches where id in ${sql(ids)}
  `;
  expect(matches).toHaveLength(ids.length);
  for (const match of matches) {
    expect(match.status).toBe("COMPLETED");
    expect(match.winner_id).toBe(match.opponent_id);
    expect(Number(match.payout_amount) + Number(match.fee_amount)).toBe(Number(match.stake) * 2);
  }
  const [cross] = await sql`
    select count(*)::int c from pvp_test.pool_payouts p
    join pvp_test.pool_matches m on m.id = p.match_id
    where m.id in ${sql(ids)}
      and p.beneficiary_id is distinct from m.creator_id
      and p.beneficiary_id is distinct from m.opponent_id
  `;
  expect(cross.c).toBe(0);
  const [settled] = await sql`
    select count(*)::int c from (
      select game_id from pvp_test.ledger_transactions
      where kind = 'pool_settlement' and game_id in ${sql(ids)}
      group by game_id having count(*) <> 1
    ) bad
  `;
  expect(settled.c).toBe(0);
  const [doubleSeat] = await sql`
    select count(*)::int c from (
      select user_id from (
        select creator_id as user_id from pvp_test.pool_matches where id in ${sql(ids)}
        union all
        select opponent_id from pvp_test.pool_matches where id in ${sql(ids)}
      ) seats
      group by user_id having count(*) > 1
    ) dup
  `;
  expect(doubleSeat.c).toBe(0);
}

async function sweep() {
  const open = await sql`
    select id, status, creator_id from pvp_test.pool_matches
    where status in ('WAITING','STARTING','PLAYING')
  `;
  for (const match of open) {
    if (match.status === "WAITING") {
      await sql`
        update pvp_test.pool_matches
        set expires_at = clock_timestamp() - interval '1 second'
        where id = ${match.id}
      `;
      await sql`select pvp_test._pool_tick_one(${match.id})`;
    } else if (match.status === "STARTING") {
      await sql`select pvp_test.pool_refund_starting(${match.id})`;
    } else {
      await sql`select pvp_test.pool_forfeit_seat(${match.id}, 'A')`;
    }
  }
}

async function wave(count: number) {
  const ids: number[] = [];
  const setupStarted = performance.now();
  for (let i = 0; i < count; i++) {
    const creator = await newUser(`c${count.toString(36)}${i.toString(36)}`);
    const joiner = await newUser(`j${count.toString(36)}${i.toString(36)}`);
    const created = await matchmake(creator);
    if (!created.ok) throw new Error(created.message);
    const joined = await joinOpen(joiner, created.match_id);
    if (!created.ok || created.role !== "created")
      throw new Error(created.ok ? created.role : created.message);
    if (!joined.ok || joined.role !== "joined" || joined.match_id !== created.match_id) {
      throw new Error(joined.ok ? `${joined.role} ${joined.match_id}` : joined.message);
    }
    ids.push(created.match_id);
  }
  const setupMs = performance.now() - setupStarted;
  const started = performance.now();

  await Promise.all(
    ids.map(async (id) => {
      const [secret] = await sql`select pvp_test.pool_read_secret(${id}) seed`;
      const table = freshTable(bytesFromHex(String(secret.seed)));
      await sql`select pvp_test.pool_begin(${id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    }),
  );
  const [live] =
    await sql`select count(*)::int c from pvp_test.pool_matches where status = 'PLAYING' and id in ${sql(ids)}`;
  expect(live.c).toBe(count);
  await Promise.all(ids.map((id) => sql`select pvp_test.pool_forfeit_seat(${id}, 'A')`));
  await Promise.all(ids.map((id) => sql`select pvp_test.pool_forfeit_seat(${id}, 'A')`));
  await assertClosed(ids);
  const samples = (
    await sql`select extract(epoch from (completed_at - phase_at)) * 1000 as ms
      from pvp_test.pool_matches where id in ${sql(ids)}`
  ).map((row) => Number(row.ms));
  return {
    count,
    setupMs: Math.round(setupMs),
    parallelMs: Math.round(performance.now() - started),
    settleP50: Math.round(percentile(samples, 50)),
    settleP95: Math.round(percentile(samples, 95)),
  };
}

d("pool matches stay isolated under concurrency", () => {
  beforeAll(async () => {
    await applyTestSchema(sql);
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("runs 2 matches at once", async () => {
    await sweep();
    const timing = await wave(2);
    expect(await books()).toBe(0);
    console.log("pool-concurrency", timing);
  }, 60_000);

  it("runs 10 matches at once", async () => {
    const timing = await wave(10);
    expect(await books()).toBe(0);
    console.log("pool-concurrency", timing);
  }, 60_000);

  it("runs 50 matches at once", async () => {
    const timing = await wave(50);
    expect(await books()).toBe(0);
    console.log("pool-concurrency", timing);
  }, 120_000);

  it("runs 100 matches at once", async () => {
    const timing = await wave(100);
    expect(await books()).toBe(0);
    console.log("pool-concurrency", timing);
  }, 180_000);

  it("lets only one player take the open seat", async () => {
    await sweep();
    const host = await newUser("hostseat");
    const opened = await matchmake(host);
    expect(opened.ok && opened.role).toBe("created");
    if (!opened.ok) return;
    const rivals = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        newUser(`rival${i}`).then((uid) => joinOpen(uid, opened.match_id)),
      ),
    );
    const took = rivals.filter(
      (row) => row.ok && row.role === "joined" && row.match_id === opened.match_id,
    );
    expect(took).toHaveLength(1);
    const [seat] =
      await sql`select opponent_id, status from pvp_test.pool_matches where id = ${opened.match_id}`;
    expect(seat.status).toBe("STARTING");
    expect(seat.opponent_id).toBeTruthy();
    const [slots] = await sql`
      select count(*)::int c from (
        select slot from pvp_test.pool_entries where match_id = ${opened.match_id}
        group by slot having count(*) > 1
      ) overfull
    `;
    expect(slots.c).toBe(0);
    await sweep();
    expect(await books()).toBe(0);
  }, 60_000);

  it("cannot spend the same balance on two tables at once", async () => {
    await sweep();
    const uid = await newUser("thinwallet");
    await sql`update pvp_test.wallet_accounts set balance = 100 where owner_id = ${uid} and kind = 'user_available' and account_type = 'test_credit'`;
    const [first, second] = await Promise.all([matchmake(uid), matchmake(uid)]);
    const ok = [first, second].filter((row) => row.ok);
    const denied = [first, second].filter((row) => !row.ok);
    expect(ok).toHaveLength(1);
    expect(denied[0]?.message).toMatch(/INSUFFICIENT_BALANCE|ALREADY_IN_MATCH/);
    const locked = Number(
      (
        await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = 'user_locked' and account_type = 'test_credit'`
      )[0].balance,
    );
    expect(locked).toBe(100);
    await sql`
      update pvp_test.pool_matches
      set expires_at = clock_timestamp() - interval '1 second'
      where id = ${ok[0]!.match_id}
    `;
    await sql`select pvp_test._pool_tick_one(${ok[0]!.match_id})`;
    const available = Number(
      (
        await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = 'user_available' and account_type = 'test_credit'`
      )[0].balance,
    );
    expect(available).toBe(100);
    await sql`update pvp_test.wallet_accounts set balance = 100000 where owner_id = ${uid} and kind = 'user_available' and account_type = 'test_credit'`;
  });

  it("rejects a shot, a commit, and a settle aimed at another match", async () => {
    await sweep();
    const a1 = await newUser("isoa1");
    const b1 = await newUser("isob1");
    const a2 = await newUser("isoa2");
    const b2 = await newUser("isob2");
    const m1 = await matchmake(a1);
    const m2 = await matchmake(a2);
    if (!m1.ok || !m2.ok) throw new Error(m1.ok ? m2.message : m1.message);
    const j1 = await joinOpen(b1, m1.match_id);
    const j2 = await joinOpen(b2, m2.match_id);
    expect(m1.ok && j1.ok && j1.match_id).toBe(m1.match_id);
    expect(m2.ok && j2.ok && j2.match_id).toBe(m2.match_id);
    for (const id of [m1.match_id, m2.match_id]) {
      const [secret] = await sql`select pvp_test.pool_read_secret(${id}) seed`;
      const table = freshTable(bytesFromHex(String(secret.seed)));
      await sql`select pvp_test.pool_begin(${id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    }
    const shot = {
      angleMilli: 0,
      power: 4000,
      spinX: 0,
      spinY: 0,
      placeX: null,
      placeY: null,
      calledPocket: null,
    };
    await expect(
      as(
        b1,
        (tx) =>
          tx`select pvp_test.pool_prepare_shot(${m1.match_id}, ${sql.json(shot)}::jsonb, ${randomUUID()})`,
      ),
    ).rejects.toThrow(/NOT_YOUR_TURN/);
    await expect(
      as(
        a1,
        (tx) =>
          tx`select pvp_test.pool_prepare_shot(${m2.match_id}, ${sql.json(shot)}::jsonb, ${randomUUID()})`,
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    const [hash] =
      await sql`select state_hash, state from pvp_test.pool_matches where id = ${m2.match_id}`;
    await expect(
      sql`select pvp_test.pool_commit_shot(${m1.match_id}, 1, ${hash.state}::jsonb, ${hash.state_hash}, '{}'::jsonb)`,
    ).rejects.toThrow(/NO_PENDING_SHOT|RESULT_MISMATCH|HASH_MISMATCH|BAD_STATE/);
    const [untouched] =
      await sql`select state_hash, status from pvp_test.pool_matches where id = ${m1.match_id}`;
    expect(untouched.status).toBe("PLAYING");
    await sql`select pvp_test.pool_forfeit_seat(${m1.match_id}, 'A')`;
    await sql`select pvp_test.pool_forfeit_seat(${m2.match_id}, 'B')`;
    const [one] = await sql`select winner_id from pvp_test.pool_matches where id = ${m1.match_id}`;
    const [two] = await sql`select winner_id from pvp_test.pool_matches where id = ${m2.match_id}`;
    expect(one.winner_id).toBe(b1);
    expect(two.winner_id).toBe(a2);
    expect(await books()).toBe(0);
  }, 60_000);

  it("replays an idempotency key without a second debit", async () => {
    await sweep();
    const uid = await newUser("idempo");
    const key = randomUUID();
    const call = () =>
      as(uid, async (tx) => {
        const [found] = await tx`select pvp_test.pool_matchmake(100, ${key}) r`;
        return found.r as { match_id: number; duplicate: boolean };
      });
    const first = await call();
    const second = await call();
    expect(second.duplicate).toBe(true);
    expect(second.match_id).toBe(first.match_id);
    const [locked] = await sql`
      select balance from pvp_test.wallet_accounts
      where owner_id = ${uid} and kind = 'user_locked' and account_type = 'test_credit'
    `;
    expect(Number(locked.balance)).toBe(100);
    await sql`
      update pvp_test.pool_matches
      set expires_at = clock_timestamp() - interval '1 second'
      where id = ${first.match_id}
    `;
    await sql`select pvp_test._pool_tick_one(${first.match_id})`;
    expect(await books()).toBe(0);
  });

  it("keeps one winner when both seats forfeit together", async () => {
    await sweep();
    const a = await newUser("botha");
    const b = await newUser("bothb");
    const created = await matchmake(a);
    if (!created.ok) throw new Error(created.message);
    const joined = await joinOpen(b, created.match_id);
    expect(created.ok && joined.ok && joined.match_id).toBe(created.match_id);
    const id = created.match_id;
    const [secret] = await sql`select pvp_test.pool_read_secret(${id}) seed`;
    const table = freshTable(bytesFromHex(String(secret.seed)));
    await sql`select pvp_test.pool_begin(${id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    const shot = {
      angleMilli: 400_000,
      power: 0,
      spinX: 0,
      spinY: 0,
      placeX: null,
      placeY: null,
      calledPocket: 9,
    };
    await expect(
      as(
        a,
        (tx) =>
          tx`select pvp_test.pool_prepare_shot(${id}, ${sql.json(shot)}::jsonb, ${randomUUID()})`,
      ),
    ).rejects.toThrow(/BAD_SHOT/);
    const [before] = await sql`select state_hash from pvp_test.pool_matches where id = ${id}`;
    await Promise.all([
      sql`select pvp_test.pool_forfeit_seat(${id}, 'A')`,
      sql`select pvp_test.pool_forfeit_seat(${id}, 'B')`,
    ]);
    const [match] = await sql`
      select status, winner_id, state_hash from pvp_test.pool_matches where id = ${id}
    `;
    expect(match.status).toBe("COMPLETED");
    expect([a, b]).toContain(match.winner_id);
    expect(match.state_hash).not.toBe(before.state_hash);
    const [settled] = await sql`
      select count(*)::int c from pvp_test.ledger_transactions
      where kind = 'pool_settlement' and game_id = ${id}
    `;
    expect(settled.c).toBe(1);
    await expect(
      as(
        a,
        (tx) =>
          tx`select pvp_test.pool_prepare_shot(${id}, ${sql.json(JSON.parse(JSON.stringify({ ...shot, angleMilli: 0, power: 1000, calledPocket: null })))}::jsonb, ${randomUUID()})`,
      ),
    ).rejects.toThrow(/MATCH_NOT_LIVE|MATCH_FINISHED/);
    expect(await books()).toBe(0);
  }, 60_000);

  it("does not both refund and settle the same match", async () => {
    await sweep();
    const a = await newUser("racea");
    const b = await newUser("raceb");
    const created = await matchmake(a);
    if (!created.ok) throw new Error(created.message);
    const joined = await joinOpen(b, created.match_id);
    expect(created.ok && joined.ok && joined.match_id).toBe(created.match_id);
    const id = created.match_id;
    const [secret] = await sql`select pvp_test.pool_read_secret(${id}) seed`;
    const table = freshTable(bytesFromHex(String(secret.seed)));
    const raced = await Promise.allSettled([
      sql`select pvp_test.pool_begin(${id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`,
      sql`select pvp_test.pool_refund_starting(${id})`,
    ]);
    const rejected = raced.filter((row) => row.status === "rejected");
    expect(rejected.length).toBeLessThanOrEqual(1);
    const [opened] = await sql`select status from pvp_test.pool_matches where id = ${id}`;
    if (opened.status === "PLAYING") await sql`select pvp_test.pool_forfeit_seat(${id}, 'A')`;
    const [match] = await sql`select status, winner_id from pvp_test.pool_matches where id = ${id}`;
    const [settled] = await sql`
      select count(*)::int c from pvp_test.ledger_transactions
      where kind = 'pool_settlement' and game_id = ${id}
    `;
    const [refunded] = await sql`
      select count(*)::int c from pvp_test.ledger_transactions
      where kind = 'pool_refund' and game_id = ${id}
    `;
    expect(settled.c + refunded.c).toBe(1);
    if (match.status === "COMPLETED") {
      expect(match.winner_id).toBe(b);
      expect(settled.c).toBe(1);
      expect(refunded.c).toBe(0);
    } else {
      expect(match.status).toBe("CANCELLED");
      expect(match.winner_id).toBeNull();
      expect(refunded.c).toBe(1);
    }
    expect(await books()).toBe(0);
  }, 60_000);
});
