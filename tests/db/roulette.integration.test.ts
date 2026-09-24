/**
 * Roulette adversarial audit suite. Runs against an isolated `pvp_test` copy of
 * every migration using real concurrent Postgres transactions; permission checks
 * read the live catalog (read-only). Requires SUPABASE_DB_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { rouletteSlot } from "../../src/lib/fairness/roulette";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 12, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
async function newUser(name: string, extra = 0) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${(name + "_" + id.slice(0, 6)).slice(0, 20)}, true)`);
  if (extra > 0) {
    await sql.begin(async (tx) => {
      const [t] = await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
        values ('test_credit_grant', ${"audit:" + randomUUID()}, 'test_credit', ${id}, 'audit grant') returning id`;
      await tx`select pvp_test._post(${t.id}, pvp_test._system_account('test_faucet','TEST_USD','test_credit'), ${-extra})`;
      await tx`select pvp_test._post(${t.id}, pvp_test._user_account(${id}, 'user_available','TEST_USD','test_credit'), ${extra})`;
    });
  }
  return id;
}
const bet = (uid: string, color: string, amount: number | string, key = randomUUID()) =>
  as(uid, async (tx) => (await tx`select pvp_test.roulette_bet(${color}::pvp_test.roulette_color, ${amount}::bigint, ${key}) as r`)[0].r);
const advance = async (gid: number) => (await sql`select pvp_test.roulette_advance(${gid}) as r`)[0].r as string;
const game = async (gid: number) => (await sql`select * from pvp_test.roulette_games where id = ${gid}`)[0];
const bal = async (uid: string, kind = "user_available") =>
  Number((await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind}`)[0]?.balance ?? 0);
const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return String((e as Error).message);
  }
};

async function setCfg(over: Partial<Record<string, number>> = {}) {
  const c = { betting_seconds: 3, max_bet: 1000000, lock_ms: 100, spin_ms: 200, max_pot: 100000000, max_bets_per_user: 10, max_bets_per_round: 500, ...over };
  await sql`update pvp_test.roulette_config set betting_seconds=${c.betting_seconds}, lock_ms=${c.lock_ms}, spin_ms=${c.spin_ms},
    max_pot=${c.max_pot}, max_bet=${c.max_bet}, max_bets_per_user=${c.max_bets_per_user}, max_bets_per_round=${c.max_bets_per_round}`;
}
async function drive(gid: number) {
  for (let i = 0; i < 100; i++) {
    const g = await game(gid);
    if (g.status === "COMPLETED" || g.status === "CANCELLED") return g;
    await advance(gid);
    await sleep(60);
  }
  throw new Error("round did not finish");
}
async function openRound() {
  return Number((await sql`select pvp_test._roulette_ensure_open() as id`)[0].id);
}

/** Global and per-round financial invariants. */
async function assertInvariants() {
  const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  expect((await sql`select id from pvp_test.wallet_accounts where kind <> 'test_faucet' and balance < 0`).length).toBe(0);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const unb = await sql`select tx_id from pvp_test.ledger_postings group by tx_id having sum(amount) <> 0`;
  expect(unb.length).toBe(0);
  const orphanBets = await sql`select b.id from pvp_test.roulette_bets b left join pvp_test.ledger_transactions t
    on t.id = b.ledger_tx_id and t.kind = 'roulette_entry' where t.id is null`;
  expect(orphanBets.length).toBe(0);
  const orphanDebits = await sql`select t.id from pvp_test.ledger_transactions t where t.kind='roulette_entry'
    and not exists (select 1 from pvp_test.roulette_bets b where b.ledger_tx_id = t.id)`;
  expect(orphanDebits.length).toBe(0);
  // Every bet ends with at most one financial outcome.
  const dbl = await sql`select b.id from pvp_test.roulette_bets b where
    (select count(*) from pvp_test.ledger_transactions t where t.idempotency_key in
      ('roulette:bet:' || b.id || ':settle', 'roulette:bet:' || b.id || ':refund')) > 1`;
  expect(dbl.length).toBe(0);
  // Nothing is left locked once no round is live.
  const [live] = await sql`select count(*)::int c from pvp_test.roulette_games where status not in ('COMPLETED','CANCELLED','WAITING')`;
  if (live.c === 0) {
    const [l] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts where kind='user_locked'`;
    expect(Number(l.s)).toBe(0);
  }
  const ic = (await sql`select pvp_test.roulette_integrity_check() as r`)[0].r;
  expect(ic.incidents).toBe(0);
}

d("roulette adversarial audit (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 90000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
  });
  beforeEach(async () => {
    await sql`truncate pvp_test.audit_logs, pvp_test.roulette_payouts, pvp_test.roulette_results, pvp_test.roulette_bets,
      pvp_test.roulette_game_secrets, pvp_test.roulette_games, pvp_test.ledger_postings, pvp_test.ledger_transactions,
      pvp_test.wallet_accounts, pvp_test.profiles, pvp_test.integrity_incidents restart identity cascade`;
    await sql`update pvp_test.worker_tick_gate set last_run_at = '-infinity'`;
    await setCfg();
  });

  it("state machine: every illegal transition is rejected by the database", async () => {
    const u = await newUser("alice");
    const tryStatus = (gid: number, s: string) => err(sql`update pvp_test.roulette_games set status = ${s}::pvp_test.roulette_status where id = ${gid}`);
    const g0 = await openRound();
    for (const s of ["COMPLETED", "SETTLEMENT", "SPINNING", "LOCKED", "CANCELLED"]) expect(await tryStatus(g0, s)).toMatch(/ILLEGAL_TRANSITION/);
    await bet(u, "RED", 100);
    for (const s of ["COMPLETED", "SETTLEMENT", "SPINNING", "WAITING"]) expect(await tryStatus(g0, s)).toMatch(/ILLEGAL_TRANSITION/);
    await sleep(3100);
    expect(await advance(g0)).toBe("locked");
    for (const s of ["BETTING", "CANCELLED", "SETTLEMENT", "COMPLETED", "WAITING"]) expect(await tryStatus(g0, s)).toMatch(/ILLEGAL_TRANSITION/);
    expect(await err(sql`select pvp_test._roulette_refund(${g0}, 'attack')`)).toMatch(/NOT_CANCELLABLE/);
    // Result, timings and pot are frozen once locked.
    expect(await err(sql`update pvp_test.roulette_games set pot_amount = pot_amount + 1 where id = ${g0}`)).toMatch(/BETTING_CLOSED/);
    expect(await err(sql`update pvp_test.roulette_games set spin_end_at = now() where id = ${g0}`)).toMatch(/IMMUTABLE_FIELD/);
    expect(await err(sql`update pvp_test.roulette_games set server_seed = 'aa' where id = ${g0}`)).toMatch(/SEED_NOT_REVEALABLE/);
    expect(await err(sql`update pvp_test.roulette_results set color = 'GREEN' where game_id = ${g0}`)).toMatch(/IMMUTABLE_RECORD/);
    await sleep(150);
    await advance(g0);
    const mid = await game(g0);
    if (mid.status === "SPINNING") {
      for (const s of ["CANCELLED", "BETTING", "COMPLETED"]) expect(await tryStatus(g0, s)).toMatch(/ILLEGAL_TRANSITION/);
      expect(await err(sql`update pvp_test.roulette_games set winning_color = 'GREEN' where id = ${g0}`)).toMatch(/IMMUTABLE_FIELD|ILLEGAL/);
    }
    const done = await drive(g0);
    expect(done.status).toBe("COMPLETED");
    for (const s of ["BETTING", "SETTLEMENT", "CANCELLED"]) expect(await tryStatus(g0, s)).toMatch(/IMMUTABLE_RECORD/);
    expect(await err(sql`select pvp_test._roulette_settle(${g0})`)).toMatch(/NOT_IN_SETTLEMENT/);
    expect(await err(sql`select pvp_test._roulette_refund(${g0}, 'attack')`)).toMatch(/NOT_CANCELLABLE/);
    expect(await err(sql`delete from pvp_test.roulette_games where id = ${g0}`)).toMatch(/IMMUTABLE_RECORD/);
    expect(await err(sql`update pvp_test.roulette_bets set status = 'WON', payout_amount = 999999`)).toMatch(/ILLEGAL_TRANSITION|IMMUTABLE/);

    // Cancelled round is terminal too.
    const g1 = await openRound();
    await bet(u, "BLACK", 100);
    await sql`select pvp_test._roulette_refund(${g1}, 'STUCK')`;
    for (const s of ["BETTING", "COMPLETED", "LOCKED"]) expect(await tryStatus(g1, s)).toMatch(/IMMUTABLE_RECORD/);
    expect(await err(sql`select pvp_test._roulette_refund(${g1}, 'again')`)).toMatch(/NOT_CANCELLABLE/);
    expect(await bal(u)).toBe(100000 - 100 + (done.winning_color === "RED" ? 200 : 0));
    await assertInvariants();
  }, 60000);

  it("advance never cancels a round inside the recovery grace period", async () => {
    const u = await newUser("alice");
    const gid = await openRound();
    expect(await advance(gid)).toBe("not_due"); // WAITING
    await bet(u, "RED", 100);
    expect(await advance(gid)).toBe("not_due"); // before the DB deadline
    await sleep(3100);
    const r = await advance(gid);
    expect(r).not.toBe("cancelled");
    expect((await drive(gid)).status).toBe("COMPLETED");
    await assertInvariants();
  }, 30000);

  it("amount validation: min, max and malformed values", async () => {
    await setCfg({ betting_seconds: 30 });
    const u = await newUser("alice", 2_000_000);
    const cases: [number | string, RegExp | "OK"][] = [
      [0, /BELOW_MIN_WAGER/], [-100, /BELOW_MIN_WAGER/], [1, /BELOW_MIN_WAGER/], [99, /BELOW_MIN_WAGER/], [100, "OK"],
      [101, "OK"], [111, "OK"], [1_000_000, "OK"], [1_000_001, /ABOVE_MAX_WAGER/], ["9223372036854775807", /ABOVE_MAX_WAGER/],
      ["9223372036854775808", /out of range/], ["1.5", /invalid input syntax/], ["NaN", /invalid input syntax/],
      ["Infinity", /invalid input syntax/], ["1e3", /invalid input syntax/],
    ];
    for (const [amt, want] of cases) {
      const r = await err(bet(u, "RED", amt));
      if (want === "OK") expect(r).toBe("OK");
      else expect(r).toMatch(want);
    }
    expect(await err(bet(u, "YELLOW", 100))).toMatch(/INVALID_COLOR/); // not on wheel v3
    expect(await err(as(u, (tx) => tx`select pvp_test.roulette_bet(null, 100, ${randomUUID()})`))).toMatch(/INVALID_COLOR/);
    expect(await err(bet(u, "PINK", 100))).toMatch(/invalid input value for enum/);
    expect(await err(bet(u, "RED", 100, "short"))).toMatch(/INVALID_IDEMPOTENCY_KEY/);
    expect(await err(as(null, (tx) => tx`select pvp_test.roulette_bet('RED', 100, ${randomUUID()})`))).toMatch(/AUTH_REQUIRED/);
    const poor = await newUser("poor");
    expect(await err(bet(poor, "RED", 100001))).toMatch(/INSUFFICIENT_BALANCE/);
    await drive(Number((await sql`select id from pvp_test.roulette_games order by id desc limit 1`)[0].id));
    await assertInvariants();
  }, 90000);

  it("per-user limit: 11 simultaneous bets from one player accept exactly 10", async () => {
    await setCfg({ betting_seconds: 10 });
    const u = await newUser("alice");
    const res = await Promise.allSettled(Array.from({ length: 11 }, () => bet(u, "RED", 100)));
    expect(res.filter((r) => r.status === "fulfilled").length).toBe(10);
    expect(res.filter((r) => r.status === "rejected").every((r) => /TOO_MANY_BETS/.test(String((r as PromiseRejectedResult).reason)))).toBe(true);
    expect(await err(bet(u, "BLACK", 100))).toMatch(/TOO_MANY_BETS/); // 12th, sequential
    const gid = Number((await sql`select game_id from pvp_test.roulette_bets limit 1`)[0].game_id);
    expect((await game(gid)).bet_count).toBe(10);
    await drive(gid);
    await assertInvariants();
  }, 60000);

  it("idempotency: replays never double-charge; key reuse with other params is refused", async () => {
    const u = await newUser("alice");
    const key = randomUUID();
    const res = await Promise.allSettled(Array.from({ length: 8 }, () => bet(u, "GREEN", 500, key)));
    expect(res.every((r) => r.status === "fulfilled")).toBe(true);
    const vals = res.map((r) => (r as PromiseFulfilledResult<{ duplicate: boolean; bet_id: string }>).value);
    expect(vals.filter((v) => !v.duplicate).length).toBe(1);
    expect(new Set(vals.map((v) => v.bet_id)).size).toBe(1);
    expect(await bal(u)).toBe(100000 - 500);
    expect(await err(bet(u, "GREEN", 600, key))).toMatch(/IDEMPOTENCY_KEY_REUSED/);
    expect(await err(bet(u, "RED", 500, key))).toMatch(/IDEMPOTENCY_KEY_REUSED/);
    const gid = Number((await sql`select game_id from pvp_test.roulette_bets limit 1`)[0].game_id);
    await drive(gid);
    await assertInvariants();
  }, 30000);

  it("pot cap and round cap hold under 40 simultaneous bets", async () => {
    await setCfg({ max_pot: 5000, max_bet: 5000, max_bets_per_round: 100, betting_seconds: 10 });
    const users = await Promise.all(Array.from({ length: 8 }, (_, i) => newUser("p" + i)));
    const res = await Promise.allSettled(Array.from({ length: 40 }, (_, i) => bet(users[i % 8]!, ["RED", "BLACK", "GREEN"][i % 3]!, 150)));
    const ok = res.filter((r) => r.status === "fulfilled").length;
    const gid = Number((await sql`select id from pvp_test.roulette_games order by id desc limit 1`)[0].id);
    const g = await game(gid);
    expect(Number(g.pot_amount)).toBeLessThanOrEqual(5000);
    expect(ok).toBe(33); // floor(5000/150)
    expect(g.bet_count).toBe(ok);
    for (const r of res) if (r.status === "rejected") expect(String(r.reason)).toMatch(/POT_LIMIT_REACHED|ROUND_FULL/);
    await drive(gid);
    await assertInvariants();
  }, 60000);

  it("exact-close race: 30 bets across the deadline plus concurrent advances", async () => {
    for (let round = 0; round < 3; round++) {
      const users = await Promise.all(Array.from({ length: 10 }, (_, i) => newUser(`r${round}u${i}`)));
      const first = await bet(users[0]!, "RED", 100);
      const gid = Number(first.game_id);
      const [{ t }] = await sql`select extract(epoch from clock_timestamp()) * 1000 as t`;
      const skew = Number(t) - Date.now(); // DB clock minus local clock
      const ends = +new Date((await game(gid)).betting_ends_at) - skew;
      const offsets = Array.from({ length: 30 }, (_, i) => -150 + i * 10); // -150ms .. +140ms around the DB deadline
      const tasks = offsets.map((o, i) =>
        sleep(Math.max(0, ends + o - Date.now())).then(() => bet(users[i % 10]!, ["RED", "BLACK", "GREEN"][i % 3]!, 100 + i)),
      );
      const adv = [0, 5, 20].map((o) => sleep(Math.max(0, ends + o - Date.now())).then(() => advance(gid)));
      const res = await Promise.allSettled([...tasks, ...adv]);
      for (const r of res.slice(0, 30)) if (r.status === "rejected") expect(String(r.reason)).toMatch(/BETTING_CLOSED/);
      const g = await game(gid);
      const bets = await sql`select * from pvp_test.roulette_bets where game_id = ${gid}`;
      for (const b of bets) expect(+b.created_at).toBeLessThan(+g.betting_ends_at);
      expect(bets.length).toBe(g.bet_count);
      const accepted = res.slice(0, 30).filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ game_id: number }>[];
      const inRound = accepted.filter((r) => Number(r.value.game_id) === gid).length;
      expect(bets.length).toBe(inRound + 1);
      // Late bets can only land in the next round, never in the locked one.
      for (const r of accepted) expect([gid, gid + 1]).toContain(Number(r.value.game_id));
      const [result] = await sql`select * from pvp_test.roulette_results where game_id = ${gid}`;
      const done = await drive(gid);
      expect(done.winning_color).toBe(result.color); // result could not change during the race
      const next = await game(gid + 1);
      if (next && next.status !== "WAITING") await drive(gid + 1);
      await assertInvariants();
    }
  }, 120000);

  it("betting is refused in LOCKED, SPINNING and SETTLEMENT; late bets open the next round", async () => {
    const [a, b] = [await newUser("a"), await newUser("b")];
    const gid = Number((await bet(a, "RED", 100)).game_id);
    await sleep(3100);
    await advance(gid);
    // A post-lock bet can never reach the locked round: it lands in a new round.
    const r = await bet(b, "RED", 100);
    expect(Number(r.game_id)).not.toBe(gid);
    expect((await game(gid)).bet_count).toBe(1);
    await drive(gid);
    await drive(Number(r.game_id));
    await assertInvariants();
  }, 30000);

  it("payout math: gross 2x/14x, rounded down, for every audited amount", async () => {
    await setCfg({ betting_seconds: 40 });
    const amounts = [100, 101, 111, 1000, 1001, 9999, 10001, 99999, 1_000_000];
    const users = await Promise.all(amounts.map((a, i) => newUser("m" + i, a * 3)));
    const before = await Promise.all(users.map((u) => bal(u)));
    let gid = 0;
    for (let i = 0; i < amounts.length; i++)
      for (const c of ["RED", "BLACK", "GREEN"]) gid = Number((await bet(users[i]!, c, amounts[i]!)).game_id);
    const done = await drive(gid);
    expect(done.status).toBe("COMPLETED");
    const mult: Record<string, number> = { RED: 20000, BLACK: 20000, GREEN: 140000 };
    let total = 0;
    for (let i = 0; i < amounts.length; i++) {
      const win = Math.floor((amounts[i]! * mult[done.winning_color]!) / 10000);
      total += win;
      expect(await bal(users[i]!)).toBe(before[i]! - 3 * amounts[i]! + win);
    }
    expect(Number(done.total_payout)).toBe(total);
    expect(Number(done.house_result)).toBe(Number(done.pot_amount) - total);
    const bets = await sql`select * from pvp_test.roulette_bets where game_id = ${gid}`;
    for (const b of bets) {
      expect(b.status).toBe(b.color === done.winning_color ? "WON" : "LOST");
      expect(Number(b.payout_amount)).toBe(b.color === done.winning_color ? Math.floor((Number(b.amount) * b.multiplier_bps) / 10000) : 0);
    }
    await assertInvariants();
  }, 60000);

  it("settlement failure is retried safely and never pays twice", async () => {
    const users = await Promise.all([newUser("a"), newUser("b"), newUser("c")]);
    let gid = 0;
    for (const [i, c] of ["RED", "BLACK", "GREEN"].entries()) gid = Number((await bet(users[i]!, c, 1000)).game_id);
    await sleep(3400);
    // Failure injected after ledger writes: the whole settlement rolls back.
    const r1 = await sql.begin(async (tx) => {
      await tx`select set_config('pvp.fail_after_ledger', 'on', true)`;
      for (let i = 0; i < 5; i++) {
        const r = (await tx`select pvp_test.roulette_advance(${gid}) as r`)[0].r;
        if (r === "failed" || r === "settled") return r;
        await sleep(100);
      }
      return "stuck";
    });
    expect(r1).toBe("failed");
    expect((await game(gid)).status).toBe("SETTLEMENT");
    expect((await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id=${gid} and kind='roulette_settlement'`)[0].c).toBe(0);
    // Duplicate workers retry concurrently: exactly one settlement.
    const res = await Promise.allSettled(Array.from({ length: 6 }, () => advance(gid)));
    expect(res.filter((r) => r.status === "fulfilled" && r.value === "settled").length).toBe(1);
    expect((await game(gid)).status).toBe("COMPLETED");
    expect((await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id=${gid} and kind='roulette_settlement'`)[0].c).toBe(3);
    await assertInvariants();
  }, 30000);

  it("wheel math is immutable, versioned and at most 100% RTP", async () => {
    const wheels = await sql`select * from pvp_test.roulette_wheels order by version`;
    for (const w of wheels) {
      expect(w.slot_count).toBe(15);
      expect(w.layout.length).toBe(15);
      for (const [c, m] of Object.entries(w.multipliers_bps as Record<string, number>)) {
        const n = w.layout.filter((x: string) => x === c).length;
        expect((n * m) / (15 * 10000)).toBeCloseTo(14 / 15, 10); // 93.33% on every colour
      }
    }
    const v3 = wheels.find((w) => w.version === 3)!;
    expect(v3.layout.filter((x: string) => x === "GREEN").length).toBe(1);
    expect(v3.multipliers_bps).toEqual({ RED: 20000, BLACK: 20000, GREEN: 140000 });
    expect(await err(sql`update pvp_test.roulette_wheels set multipliers_bps = '{"RED":30000,"BLACK":20000,"GREEN":140000}' where version = 3`)).toMatch(/IMMUTABLE/);
    expect(await err(sql`delete from pvp_test.roulette_wheels where version = 3`)).toMatch(/IMMUTABLE/);
    expect(await err(sql`insert into pvp_test.roulette_wheels (version, slot_count, layout, multipliers_bps)
      values (99, 15, ${sql.array(Array(15).fill("RED"))}::pvp_test.roulette_color[], '{"RED":20000}')`)).toMatch(/RTP_ABOVE_100/);
    // Each round stores its own version; settlement uses the stored one.
    const u = await newUser("a");
    const gid = Number((await bet(u, "RED", 100)).game_id);
    expect((await game(gid)).wheel_version).toBe(3);
    const [b] = await sql`select multiplier_bps from pvp_test.roulette_bets where game_id=${gid}`;
    expect(b.multiplier_bps).toBe(20000);
    await drive(gid);
    await assertInvariants();
  }, 30000);

  it("provably fair: commitment first, seed hidden until settled, independent verifier agrees", async () => {
    const u = await newUser("a");
    for (let i = 0; i < 12; i++) {
      const gid = Number((await bet(u, "RED", 100)).game_id);
      const g0 = await game(gid);
      expect(g0.server_seed).toBeNull();
      expect(g0.server_seed_hash).toMatch(/^[0-9a-f]{64}$/);
      await sleep(3100);
      await advance(gid);
      const locked = await game(gid);
      expect(locked.server_seed).toBeNull();
      const [res] = await sql`select * from pvp_test.roulette_results where game_id=${gid}`;
      const done = await drive(gid);
      expect(done.server_seed).toMatch(/^[0-9a-f]{64}$/);
      const [secret] = await sql`select octet_length(server_seed) n from pvp_test.roulette_game_secrets where game_id=${gid}`;
      expect(secret.n).toBe(32);
      const { createHash } = await import("node:crypto");
      expect(createHash("sha256").update(Buffer.from(done.server_seed, "hex")).digest("hex")).toBe(done.server_seed_hash);
      const w = (await sql`select * from pvp_test.roulette_wheels where version=${done.wheel_version}`)[0];
      const v = await rouletteSlot(done.server_seed, gid, done.draw_version, w.slot_count);
      expect(v.slot).toBe(res.slot);
      expect(v.counter).toBe(res.draw_counter);
      expect(w.layout[v.slot]).toBe(done.winning_color);
      expect(res.message).toBe(`PVPCasino:roulette:v1:${gid}:${done.draw_version}:${res.draw_counter}`);
    }
    await assertInvariants();
  }, 90000);

  it("DB draw and TS verifier agree on 300 random seeds; every slot and colour is reachable", async () => {
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const seed = randomBytes(32).toString("hex");
      const [r] = await sql`select * from pvp_test.roulette_draw_slot(decode(${seed}, 'hex'), ${i + 1}, 1, 15)`;
      const v = await rouletteSlot(seed, i + 1, 1, 15);
      expect([v.slot, v.counter]).toEqual([r.slot, r.counter]);
      seen.add(r.slot);
    }
    expect(seen.size).toBe(15); // first (0) and last (14) slots included
    expect(await err(sql`select * from pvp_test.roulette_draw_slot(decode('00', 'hex'), 1, 1, 15)`)).toMatch(/INVALID_SEED/);
    expect(await err(sql`select * from pvp_test.roulette_draw_slot(decode(${"00".repeat(32)}, 'hex'), 1, 1, 1)`)).toMatch(/INVALID_RANGE/);
  }, 60000);

  it("20 concurrent ticks never advance a round early", async () => {
    const u = await newUser("a");
    const gid = Number((await bet(u, "RED", 100)).game_id);
    const res = await Promise.all(Array.from({ length: 20 }, () => as(u, async (tx) => (await tx`select pvp_test.roulette_tick() as r`)[0].r)));
    expect(res.every((r) => typeof r === "object")).toBe(true);
    expect((await game(gid)).status).toBe("BETTING"); // nothing due yet
    await drive(gid);
    await assertInvariants();
  }, 30000);
});

d("roulette live permissions (read-only catalog)", () => {
  it("browsers can only place a bet and nudge the tick; no table writes; secrets unreadable", async () => {
    const fns = await sql`select p.proname, has_function_privilege('anon', p.oid, 'execute') anon,
      has_function_privilege('authenticated', p.oid, 'execute') auth, p.prosecdef, p.proconfig
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like '%roulette%'`;
    for (const f of fns) {
      expect(f.anon).toBe(false);
      expect(f.auth).toBe(["roulette_bet", "roulette_tick"].includes(f.proname));
      if (f.prosecdef) expect(f.proconfig).toContain("search_path=\"\"");
    }
    const tbl = await sql`select c.relname, r, p from pg_class c cross join (values('anon'),('authenticated')) x(r)
      cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) y(p)
      where c.relnamespace='public'::regnamespace and c.relkind='r' and c.relname like 'roulette%' and has_table_privilege(r, c.oid, p)`;
    expect(tbl.filter((t) => t.p !== "SELECT")).toEqual([]);
    expect(tbl.filter((t) => ["roulette_game_secrets", "roulette_results"].includes(t.relname))).toEqual([]);
    const rls = await sql`select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'roulette%' and not relrowsecurity`;
    expect(rls).toEqual([]);
  });
});
