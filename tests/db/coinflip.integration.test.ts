/**
 * Coinflip engine integration + concurrency + failure-injection suite.
 * Runs against an isolated `pvp_test` schema built from the real migrations.
 * Requires SUPABASE_DB_URL; skipped otherwise. Any failure blocks deployment.
 */
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { verifyCoinflip } from "../../src/lib/fairness/coinflip";
import VECTORS from "../../src/lib/fairness/coinflip-v1-vectors.json";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 10, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const START = 100000;
type Flags = { fail?: boolean; failAfterLedger?: boolean; failBeforeComplete?: boolean };

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>, f: Flags = {}): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (f.fail) await tx`select set_config('pvp.fail_settlement', 'on', true)`;
    if (f.failAfterLedger) await tx`select set_config('pvp.fail_after_ledger', 'on', true)`;
    if (f.failBeforeComplete) await tx`select set_config('pvp.fail_before_complete', 'on', true)`;
    return fn(tx);
  }) as Promise<T>;
}
async function newUser(name: string) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${name}, true)`);
  return id;
}
const create = (uid: string | null, amount: number, side: "HEADS" | "TAILS" | null, key = randomUUID()) =>
  as(uid, async (tx) => (await tx`select pvp_test.coinflip_create(${amount}, ${side}::pvp_test.coin_side, ${key}) as r`)[0].r);
const joinG = (uid: string | null, gid: number, key = randomUUID()) =>
  as(uid, async (tx) => (await tx`select pvp_test.coinflip_join(${gid}, ${key}) as r`)[0].r);
const cancel = (uid: string, gid: number) => as(uid, async (tx) => (await tx`select pvp_test.coinflip_cancel(${gid}) as r`)[0].r);
const tick = (f: Flags = {}) => as(null, async (tx) => (await tx`select pvp_test.coinflip_tick() as r`)[0].r, f);
const game = async (id: number) => (await sql`select * from pvp_test.coinflip_games where id = ${id}`)[0];
const payout = async (id: number) => (await sql`select * from pvp_test.coinflip_payouts where game_id = ${id}`)[0];
const bal = async (uid: string, kind = "user_available") =>
  Number((await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind}`)[0].balance);
const expectErr = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(code);

async function setCfg(pre = 150, anim = 200, timeout = 60, rate = 1000, maxOpen = 100) {
  await sql`update pvp_test.coinflip_config set pre_delay_ms=${pre}, animation_ms=${anim}, waiting_timeout_seconds=${timeout},
    create_rate_limit=${rate}, max_open_per_user=${maxOpen}`;
}
/** Wait until the game has passed its animation end (server time). */
async function waitEnd(id: number) {
  const g = await game(id);
  const ms = +g.animation_end_at - Date.now() + 80;
  if (ms > 0) await sleep(ms);
}
async function playRound(a: string, b: string, amount = 500) {
  const { game_id } = await create(a, amount, "HEADS");
  await joinG(b, game_id);
  await waitEnd(game_id);
  return game_id as number;
}

async function assertInvariants() {
  const [s] = await sql`select coalesce(sum(balance),0)::bigint as s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const [e] = await sql`select coalesce(sum(balance),0)::bigint v from pvp_test.wallet_accounts where kind='game_escrow'`;
  expect(Number(e.v)).toBe(0);
  // Locked funds == wagers of games not yet settled/cancelled.
  const [l] = await sql`select coalesce(sum(balance),0)::bigint v from pvp_test.wallet_accounts where kind='user_locked'`;
  const [o] = await sql`select coalesce(sum(case when status='WAITING' then amount else pot_amount end),0)::bigint v
    from pvp_test.coinflip_games where status in ('WAITING','READY','FLIPPING','SETTLEMENT')`;
  expect(Number(l.v)).toBe(Number(o.v));
  for (const g of await sql`select * from pvp_test.coinflip_games`) {
    const ents = await sql`select * from pvp_test.coinflip_entries where game_id = ${g.id} order by slot`;
    expect(ents.length).toBe(g.status === "WAITING" || g.status === "CANCELLED" ? 1 : 2);
    for (const en of ents) expect(Number(en.amount)).toBe(Number(g.amount));
    if (ents.length === 2) expect(ents[0].side).not.toBe(ents[1].side);
    const [debits] = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id=${g.id} and kind='coinflip_entry'`;
    expect(debits.c).toBe(ents.length);
    const [st] = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id=${g.id} and kind='coinflip_settlement'`;
    expect(st.c).toBe(g.status === "COMPLETED" ? 1 : 0);
    const [rf] = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id=${g.id} and kind='coinflip_refund'`;
    expect(rf.c).toBe(g.status === "CANCELLED" ? 1 : 0);
    if (g.status === "COMPLETED") {
      expect(Number(g.payout_amount) + Number(g.fee_amount)).toBe(Number(g.pot_amount));
      const v = await verifyCoinflip({ id: String(g.id), draw_version: g.draw_version, server_seed_hash: g.server_seed_hash, server_seed: g.server_seed, winning_side: g.winning_side });
      expect(v.ok).toBe(true);
      const w = ents.find((x) => x.user_id === g.winner_id);
      expect(w?.side).toBe(g.winning_side);
    }
  }
}

d("coinflip engine (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 60000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });
  beforeEach(async () => {
    await sql`truncate pvp_test.audit_logs, pvp_test.coinflip_payouts, pvp_test.coinflip_results, pvp_test.coinflip_entries,
      pvp_test.coinflip_game_secrets, pvp_test.coinflip_games, pvp_test.jackpot_payouts, pvp_test.jackpot_players, pvp_test.jackpot_entries,
      pvp_test.jackpot_game_secrets, pvp_test.jackpot_games, pvp_test.ledger_postings, pvp_test.ledger_transactions,
      pvp_test.wallet_accounts, pvp_test.profiles restart identity cascade`;
    await setCfg();
  });

  it("SQL and published vectors agree (independent of the TypeScript verifier)", async () => {
    for (const v of VECTORS) {
      const [r] = await sql`select * from pvp_test.coinflip_outcome(decode(${v.server_seed}, 'hex'), ${v.game_id}::bigint, ${v.draw_version})`;
      expect(r.hmac_hex).toBe(v.hmac);
      expect(r.first_byte).toBe(v.first_byte);
      expect(r.side).toBe(v.side);
      const [h] = await sql`select encode(extensions.digest(decode(${v.server_seed}, 'hex'), 'sha256'), 'hex') h`;
      expect(h.h).toBe(v.server_seed_hash);
    }
  });

  it("create locks the wager and commits the seed hash; join assigns opposite side with exact server timing", async () => {
    await setCfg(3000, 3500);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await create(a, 500, "HEADS");
    let g = await game(game_id);
    expect(g.status).toBe("WAITING");
    expect(g.server_seed_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(g.server_seed).toBeNull();
    expect(Number(g.pot_amount)).toBe(1000);
    expect(await bal(a)).toBe(START - 500);
    expect(await bal(a, "user_locked")).toBe(500);

    const r = await joinG(b, game_id);
    expect(r.side).toBe("TAILS");
    expect(r).not.toHaveProperty("winning_side");
    expect(r).not.toHaveProperty("winner_id");
    g = await game(game_id);
    expect(g.status).toBe("READY");
    expect(g.winner_id).toBeNull();
    expect(g.winning_side).toBeNull();
    const [t] = await sql`select extract(epoch from animation_start_at - joined_at)*1000 as pre, extract(epoch from animation_end_at - animation_start_at)*1000 as anim
      from pvp_test.coinflip_games where id = ${game_id}`;
    expect(Number(t.pre)).toBe(3000);
    expect(Number(t.anim)).toBe(3500);
    expect(await bal(b)).toBe(START - 500);
    expect(await bal(b, "user_locked")).toBe(500);
    await assertInvariants();
  });

  it("rejects invalid creates", async () => {
    const a = await newUser("alice");
    await expectErr(create(null, 500, "HEADS"), "AUTH_REQUIRED");
    await expectErr(create(a, 0, "HEADS"), "BELOW_MIN_WAGER");
    await expectErr(create(a, 99, "HEADS"), "BELOW_MIN_WAGER");
    await expectErr(create(a, 1000001, "HEADS"), "ABOVE_MAX_WAGER");
    await expectErr(create(a, 500, null), "INVALID_SIDE");
    await expectErr(create(a, 500, "HEADS", "short"), "INVALID_IDEMPOTENCY_KEY");
    await expectErr(as(a, (tx) => tx`select pvp_test.coinflip_create(500, 'EDGE'::pvp_test.coin_side, ${randomUUID()})`), "invalid input value");
    await sql`update pvp_test.coinflip_config set max_wager = 10000000`;
    await expectErr(create(a, START + 1, "HEADS"), "INSUFFICIENT_BALANCE");
    const nobody = randomUUID();
    await expectErr(create(nobody, 500, "HEADS"), "PROFILE_REQUIRED");
    await setCfg(150, 200, 60, 2);
    await create(a, 100, "HEADS");
    await create(a, 100, "HEADS");
    await expectErr(create(a, 100, "HEADS"), "RATE_LIMITED");
    await setCfg(150, 200, 60, 1000, 2);
    await expectErr(create(a, 100, "HEADS"), "TOO_MANY_OPEN_GAMES");
    await assertInvariants();
  });

  it("double-click create with the same key creates exactly one game and one debit", async () => {
    const a = await newUser("alice");
    const key = randomUUID();
    const rs = await Promise.all(Array.from({ length: 8 }, () => create(a, 500, "HEADS", key)));
    expect(new Set(rs.map((r) => r.game_id)).size).toBe(1);
    expect(rs.filter((r) => !r.duplicate).length).toBe(1);
    const [c] = await sql`select count(*)::int c from pvp_test.coinflip_games`;
    expect(c.c).toBe(1);
    expect(await bal(a)).toBe(START - 500);
    await assertInvariants();
  });

  it("rejects invalid joins", async () => {
    const [a, b, poor] = [await newUser("alice"), await newUser("bob"), await newUser("poor")];
    const { game_id } = await create(a, 500, "TAILS");
    await expectErr(joinG(a, game_id), "CANNOT_JOIN_OWN_GAME");
    await expectErr(joinG(null, game_id), "AUTH_REQUIRED");
    await expectErr(joinG(b, 999999), "GAME_NOT_FOUND");
    // drain poor's balance
    await sql`update pvp_test.coinflip_config set max_wager = 10000000`;
    const { game_id: big } = await create(poor, START, "HEADS");
    expect(big).toBeGreaterThan(0);
    await expectErr(joinG(poor, game_id), "INSUFFICIENT_BALANCE");
    const r = await joinG(b, game_id);
    expect(r.side).toBe("HEADS");
    await expectErr(joinG(poor, game_id), "GAME_NOT_JOINABLE");
    await assertInvariants();
  });

  it("simultaneous joins by many users: exactly one succeeds", async () => {
    const a = await newUser("alice");
    const others = await Promise.all(Array.from({ length: 8 }, (_, i) => newUser(`p${i}`)));
    const { game_id } = await create(a, 500, "HEADS");
    const res = await Promise.allSettled(others.map((u) => joinG(u, game_id)));
    expect(res.filter((r) => r.status === "fulfilled").length).toBe(1);
    for (const r of res) if (r.status === "rejected") expect(String(r.reason)).toContain("GAME_NOT_JOINABLE");
    const [c] = await sql`select count(*)::int c from pvp_test.coinflip_entries where game_id = ${game_id}`;
    expect(c.c).toBe(2);
    let lockedTotal = 0;
    for (const u of others) lockedTotal += await bal(u, "user_locked");
    expect(lockedTotal).toBe(500);
    await assertInvariants();
  });

  it("same user joining repeatedly (same key and different keys) joins once", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await create(a, 500, "HEADS");
    const key = randomUUID();
    const res = await Promise.allSettled([...Array.from({ length: 4 }, () => joinG(b, game_id, key)), joinG(b, game_id), joinG(b, game_id)]);
    const ok = res.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<{ duplicate: boolean }>).value);
    expect(ok.filter((r) => !r.duplicate).length).toBe(1);
    expect(await bal(b)).toBe(START - 500);
    await assertInvariants();
  });

  it("result is hidden until FLIPPING, visible after; seed revealed only at COMPLETED; winner gets full pot", async () => {
    await setCfg(400, 400);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await create(a, 500, "HEADS");
    await joinG(b, game_id);
    // Not due: tick must not advance, nothing public reveals the result.
    await tick();
    let g = await game(game_id);
    expect(g.status).toBe("READY");
    expect(g.winner_id).toBeNull();
    const visible = await as(null, async (tx) => {
      await tx`set local role anon`;
      return tx`select * from public.coinflip_results where game_id = ${game_id}`;
    }).catch(() => []);
    expect(visible.length).toBe(0);
    await sleep(450);
    await tick();
    g = await game(game_id);
    expect(["FLIPPING", "COMPLETED"]).toContain(g.status);
    expect(g.winning_side).not.toBeNull();
    if (g.status === "FLIPPING") expect(g.server_seed).toBeNull();
    await waitEnd(game_id);
    await tick();
    g = await game(game_id);
    expect(g.status).toBe("COMPLETED");
    expect(Number(g.payout_amount)).toBe(1000);
    expect(Number(g.fee_amount)).toBe(0);
    expect(g.server_seed).toMatch(/^[0-9a-f]{64}$/);
    const loser = g.winner_id === a ? b : a;
    expect(await bal(g.winner_id)).toBe(START - 500 + 1000);
    expect(await bal(loser)).toBe(START - 500);
    expect(await bal(a, "user_locked")).toBe(0);
    expect(await bal(b, "user_locked")).toBe(0);
    const actions = (await sql`select action from pvp_test.audit_logs where game_id = ${game_id} and game_type='coinflip' order by id`).map((r) => r.action);
    expect(actions).toEqual(["GAME_CREATED", "PLAYER_JOINED", "RESULT_COMMITTED", "GAME_READY", "FLIP_STARTED", "FLIP_COMPLETED", "PAYOUT_CREATED", "PAYOUT_SETTLED", "GAME_COMPLETED"]);
    const seedLeak = await sql`select 1 from pvp_test.audit_logs where details::text like ${"%" + g.server_seed + "%"}`;
    expect(seedLeak.length).toBe(0);
    await assertInvariants();
  });

  it("house fee is taken from the per-game snapshot", async () => {
    await sql`update pvp_test.coinflip_config set fee_bps = 500`;
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await create(a, 1000, "HEADS");
    await sql`update pvp_test.coinflip_config set fee_bps = 0`; // later config change must not affect this game
    await joinG(b, game_id);
    await waitEnd(game_id);
    await tick();
    const g = await game(game_id);
    expect(Number(g.fee_amount)).toBe(100);
    expect(Number(g.payout_amount)).toBe(1900);
    await assertInvariants();
  });

  it("duplicate and concurrent workers settle exactly once", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const ids = [];
    for (let i = 0; i < 4; i++) ids.push(await playRound(a, b, 300));
    await Promise.all(Array.from({ length: 6 }, () => tick()));
    await tick();
    for (const id of ids) expect((await game(id)).status).toBe("COMPLETED");
    const [n] = await sql`select count(*)::int c from pvp_test.ledger_transactions where kind='coinflip_settlement'`;
    expect(n.c).toBe(4);
    await tick();
    const [n2] = await sql`select count(*)::int c from pvp_test.ledger_transactions where kind='coinflip_settlement'`;
    expect(n2.c).toBe(4);
    await assertInvariants();
  });

  it("the worker cannot settle early; illegal transitions are rejected by the database", async () => {
    await setCfg(5000, 5000);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await create(a, 500, "HEADS");
    await expectErr(sql`update pvp_test.coinflip_games set status='COMPLETED' where id=${game_id}`, "ILLEGAL_TRANSITION");
    await joinG(b, game_id);
    await expectErr(sql`update pvp_test.coinflip_games set status='FLIPPING' where id=${game_id}`, "TOO_EARLY");
    await expectErr(sql`update pvp_test.coinflip_games set status='COMPLETED' where id=${game_id}`, "ILLEGAL_TRANSITION");
    await expectErr(sql`update pvp_test.coinflip_games set status='CANCELLED' where id=${game_id}`, "ILLEGAL_TRANSITION");
    await expectErr(sql`update pvp_test.coinflip_games set amount=1 where id=${game_id}`, "ILLEGAL_TRANSITION");
    const r = await as(null, async (tx) => (await tx`select pvp_test.coinflip_advance(${game_id}) as r`)[0].r);
    expect(r).toBe("not_due");
    expect((await game(game_id)).status).toBe("READY");
  });

  it("injected failure before payout: stays SETTLEMENT, nothing moves, next worker recovers", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const id = await playRound(a, b);
    const r = await tick({ fail: true });
    expect(r.failed).toBe(1);
    expect((await game(id)).status).toBe("SETTLEMENT");
    expect((await payout(id)).status).toBe("FAILED");
    expect(await bal(a, "user_locked")).toBe(500);
    await assertInvariants();
    await tick();
    expect((await game(id)).status).toBe("COMPLETED");
    const p = await payout(id);
    expect(p.status).toBe("SETTLED");
    expect(p.attempts).toBe(2);
    const acts = (await sql`select action from pvp_test.audit_logs where game_id=${id} and game_type='coinflip'`).map((x) => x.action);
    expect(acts).toContain("RECOVERY_FAILED");
    expect(acts).toContain("RECOVERY_ATTEMPTED");
    expect(acts).toContain("RECOVERY_COMPLETED");
    await assertInvariants();
  });

  it("injected crash after ledger posting / before completion rolls back fully and recovers once", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const id = await playRound(a, b);
    await tick({ failAfterLedger: true });
    expect((await game(id)).status).toBe("SETTLEMENT");
    const [n0] = await sql`select count(*)::int c from pvp_test.ledger_transactions where kind='coinflip_settlement'`;
    expect(n0.c).toBe(0);
    await tick({ failBeforeComplete: true });
    expect((await game(id)).status).toBe("SETTLEMENT");
    const [n1] = await sql`select count(*)::int c from pvp_test.ledger_transactions where kind='coinflip_settlement'`;
    expect(n1.c).toBe(0);
    await assertInvariants();
    await tick();
    expect((await game(id)).status).toBe("COMPLETED");
    const [n2] = await sql`select count(*)::int c from pvp_test.ledger_transactions where kind='coinflip_settlement'`;
    expect(n2.c).toBe(1);
    await assertInvariants();
  });

  it("a crashed worker transaction (hard rollback) leaves no trace", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const id = await playRound(a, b);
    await expect(
      sql.begin(async (tx) => {
        await tx`select pvp_test.coinflip_tick()`;
        throw new Error("worker process died");
      }),
    ).rejects.toThrow("worker process died");
    expect((await game(id)).status).toBe("READY");
    await tick();
    expect((await game(id)).status).toBe("COMPLETED");
    await assertInvariants();
  });

  it("a delayed worker completes a game whose deadlines passed long ago in one pass", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const id = await playRound(a, b);
    await sleep(300);
    const r = await tick();
    expect(r.settled).toBe(1);
    expect((await game(id)).status).toBe("COMPLETED");
  });

  it("WAITING games expire server-side with one idempotent refund; creator cancel works; join after expiry fails", async () => {
    await setCfg(150, 200, 1);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await create(a, 700, "HEADS");
    await sleep(1100);
    await expectErr(joinG(b, game_id), "GAME_EXPIRED");
    await Promise.all([tick(), tick(), tick()]);
    const g = await game(game_id);
    expect(g.status).toBe("CANCELLED");
    expect(g.cancel_reason).toBe("EXPIRED");
    expect(await bal(a)).toBe(START);
    await tick();
    const [n] = await sql`select count(*)::int c from pvp_test.ledger_transactions where kind='coinflip_refund'`;
    expect(n.c).toBe(1);

    await setCfg();
    const { game_id: g2 } = await create(a, 300, "TAILS");
    await expectErr(cancel(b, g2), "FORBIDDEN");
    await cancel(a, g2);
    await expectErr(cancel(a, g2), "GAME_NOT_CANCELLABLE");
    expect(await bal(a)).toBe(START);
    // cancel vs join race: exactly one wins
    const { game_id: g3 } = await create(a, 300, "TAILS");
    const res = await Promise.allSettled([cancel(a, g3), joinG(b, g3)]);
    expect(res.filter((r) => r.status === "fulfilled").length).toBe(1);
    await assertInvariants();
  });

  it("completed games, entries, results, payouts and secrets are immutable", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const id = await playRound(a, b);
    await tick();
    await expectErr(sql`update pvp_test.coinflip_games set winner_id = ${a} where id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`delete from pvp_test.coinflip_games where id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`update pvp_test.coinflip_entries set side = 'HEADS' where game_id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`update pvp_test.coinflip_results set winning_side = 'HEADS' where game_id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`update pvp_test.coinflip_game_secrets set server_seed = ${Buffer.alloc(32)} where game_id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`update pvp_test.coinflip_payouts set amount = 1 where game_id = ${id}`, "IMMUTABLE_RECORD");
    // Database constraint: a third entry is impossible
    const c = await newUser("carol");
    await expectErr(
      sql`insert into pvp_test.coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key)
          values (${id}, ${c}, 2, 'HEADS', 500, gen_random_uuid(), 'abcdefgh12')`,
      "GAME_NOT_JOINABLE",
    );
  });

  it("Jackpot and Coinflip share one wallet without interfering", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    await as(a, (tx) => tx`select pvp_test.jackpot_join(1000, ${randomUUID()})`);
    const id = await playRound(a, b, 400);
    await tick();
    expect((await game(id)).status).toBe("COMPLETED");
    expect(await bal(a, "user_locked")).toBe(1000); // jackpot entry still locked
    const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts`;
    expect(Number(s.s)).toBe(0);
  });

  it("stress: many concurrent games and joins keep every invariant", async () => {
    const users = await Promise.all(Array.from({ length: 10 }, (_, i) => newUser(`s${i}`)));
    const created = await Promise.all(users.slice(0, 5).map((u, i) => create(u, 100 + i * 50, i % 2 ? "HEADS" : "TAILS")));
    await Promise.allSettled(created.flatMap((c) => users.slice(5).map((u) => joinG(u, c.game_id))));
    await sleep(500);
    await Promise.all([tick(), tick(), tick()]);
    await tick();
    for (const c of created) expect((await game(c.game_id)).status).toBe("COMPLETED");
    await assertInvariants();
  }, 30000);
});
