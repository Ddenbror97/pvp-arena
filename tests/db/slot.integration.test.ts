/**
 * P2P Slott engine: ledger, turns, idempotency, promotional bonus caps/budget, fairness,
 * settlement recovery and access control. Runs against the isolated `pvp_test` schema
 * built from the real migrations. Requires SUPABASE_DB_URL; skipped otherwise.
 *
 * Tests may read slot_game_secrets (they connect as the schema owner) to compute every
 * expected grid, score and bonus independently with the TypeScript verifier.
 */
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { migrateTestSchemaToReal } from "./money";
import { slottOutcome, verifySlott } from "../../src/lib/fairness/slott";
import { SYMBOLS, WEIGHT_TOTAL, scoreGrid } from "../../src/lib/slott/paytable";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 10, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);
const LONG = 120_000;
/** Covers one findGame batch (12 open $5 matches). */
const REAL_DEPOSIT = 10_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Flags = { fail?: boolean; failBeforeComplete?: boolean };
type Row = Record<string, any>;

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>, f: Flags = {}): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (f.fail) await tx`select set_config('pvp.fail_settlement', 'on', true)`;
    if (f.failBeforeComplete) await tx`select set_config('pvp.fail_before_complete', 'on', true)`;
    return fn(tx);
  }) as Promise<T>;
}
async function asRole<T>(role: "anon" | "authenticated", uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true), set_config('request.jwt.claims', ${JSON.stringify({ role, sub: uid })}, true)`;
    await tx.unsafe(`set local role ${role}`);
    return fn(tx);
  }) as Promise<T>;
}
let userN = 0;
async function newUser(name: string) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${`${name}${++userN}`.slice(0, 20)}, true)`);
  return id;
}
const create = async (uid: string | null, stake: number, key = randomUUID()) =>
  (await as(uid, (tx) => tx`select pvp_test.slot_create(${stake}, ${key}) as r`))[0].r as { game_id: number; duplicate: boolean };
const joinG = async (uid: string | null, gid: number, key = randomUUID()) =>
  (await as(uid, (tx) => tx`select pvp_test.slot_join(${gid}, ${key}) as r`))[0].r as { duplicate: boolean };
const spin = async (uid: string | null, gid: number, n: number, key = randomUUID()) =>
  (await as(uid, (tx) => tx`select pvp_test.slot_spin(${gid}, ${n}, ${key}) as r`))[0].r as Row;
const cancel = async (uid: string, gid: number) => (await as(uid, (tx) => tx`select pvp_test.slot_cancel(${gid}) as r`))[0].r;
const tick = async (f: Flags = {}) => (await as(null, (tx) => tx`select pvp_test.slot_tick() as r`, f))[0].r as Row;
const game = async (id: number) => (await sql`select * from pvp_test.slot_games where id = ${id}`)[0] as Row;
const spinsOf = async (id: number) => sql`select * from pvp_test.slot_spins where game_id = ${id} order by spin_no`;
const seedOf = async (id: number) => ((await sql`select encode(server_seed, 'hex') s from pvp_test.slot_game_secrets where game_id = ${id}`)[0] as Row).s as string;
const bal = async (uid: string, kind = "user_available", type = "test_credit") =>
  Number((await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = ${type}`)[0]?.balance ?? 0);
const expectErr = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(code);

async function setCfg(v: Partial<Record<"pre_delay_ms" | "spin_ms" | "turn_seconds" | "waiting_timeout_seconds" | "base_spins" | "max_spins" | "max_open_per_user" | "create_rate_limit" | "fee_bps" | "max_event_bonus_cents" | "max_match_bonus_cents" | "match_cap_bps", number>> = {}) {
  const c = { pre_delay_ms: 0, spin_ms: 500, turn_seconds: 20, waiting_timeout_seconds: 1800, base_spins: 12, max_spins: 32, max_open_per_user: 100, create_rate_limit: 1000, fee_bps: 500, max_event_bonus_cents: 30000, max_match_bonus_cents: 30000, match_cap_bps: 30000, ...v };
  await sql`update pvp_test.slot_config set ${sql(c)}`;
}
async function setPromo(v: { enabled?: boolean; daily_budget_cents?: number; user_daily_cap_cents?: number } = {}) {
  await sql`update pvp_test.slot_promo_config set ${sql({ enabled: true, daily_budget_cents: 1_000_000, user_daily_cap_cents: 1_000_000, ...v })}`;
}
const PROD_TIERS: [number, string, number][] = [[3, "WILD", 2000], [4, "MEGA_WILD", 5000], [5, "GOLDEN_WILD", 10000], [6, "JACKPOT_WILD", 30000]];
/** Frequent tiers so bonus paths are exercised by ordinary seeds. */
const TEST_TIERS: [number, string, number][] = [[1, "WILD", 2000], [2, "MEGA_WILD", 5000], [3, "GOLDEN_WILD", 10000], [4, "JACKPOT_WILD", 30000]];
async function setTiers(t: [number, string, number][]) {
  await sql`delete from pvp_test.slot_bonus_tiers`;
  for (const [m, n, b] of t) await sql`insert into pvp_test.slot_bonus_tiers (min_wilds, tier, stake_bps) values (${m}, ${n}, ${b})`;
}

/** Opens the current turn immediately (tests skip the reveal wait; server rules are unchanged otherwise). */
const openTurn = (id: number) => sql`update pvp_test.slot_games set turn_opens_at = clock_timestamp() where id = ${id} and status = 'ACTIVE' and ends_at is null`;
const expireTurn = (id: number) =>
  sql`update pvp_test.slot_games set turn_opens_at = clock_timestamp() - interval '1 second', turn_deadline = clock_timestamp() - interval '1 millisecond' where id = ${id} and status = 'ACTIVE' and ends_at is null`;
async function waitEnds(id: number) {
  const g = await game(id);
  if (g.ends_at) {
    const ms = +g.ends_at - Date.now() + 120;
    if (ms > 0) await sleep(ms);
  }
}
async function playAll(id: number, a: string, b: string) {
  for (;;) {
    const g = await game(id);
    if (g.status !== "ACTIVE" || g.ends_at) break;
    await openTurn(id);
    await spin(g.next_spin % 2 === 1 ? a : b, id, g.next_spin);
  }
  await waitEnds(id);
  await tick();
  return game(id);
}

/** Independent model of the server bonus rules for one match (fresh budget/user usage). */
function expectedBonuses(
  stake: number,
  wilds: number[],
  o: { tiers: [number, string, number][]; eventCap: number; matchCap: number; budgetLeft: number; userLeft: number; enabled?: boolean },
) {
  let total = 0;
  let budget = o.budgetLeft;
  let user = o.userLeft;
  return wilds.map((w) => {
    const tier = [...o.tiers].sort((x, y) => y[0] - x[0]).find((t) => t[0] <= w);
    if (!tier || o.enabled === false) return 0;
    const req = Math.floor((stake * tier[2]) / 10000);
    const award = Math.max(0, Math.min(req, o.eventCap, o.matchCap - total, budget, user));
    total += award;
    budget -= award;
    user -= award;
    return award;
  });
}

async function wildsForSeed(id: number, n: number) {
  const seed = await seedOf(id);
  const out: number[] = [];
  for (let s = 1; s <= n; s++) out.push((await slottOutcome(seed, id, s)).wilds);
  return out;
}
/** Creates matches in parallel batches until a committed seed satisfies `ok`; cancels the rest. */
async function findGame(uid: string, stake: number, spins: number, ok: (o: { scores: number[]; wilds: number[] }) => boolean) {
  for (let batch = 0; batch < 40; batch++) {
    const ids = (await Promise.all(Array.from({ length: 12 }, () => create(uid, stake)))).map((r) => r.game_id);
    const seeds = await sql`select game_id, encode(server_seed, 'hex') s from pvp_test.slot_game_secrets where game_id in ${sql(ids)}`;
    let found: number | null = null;
    for (const r of seeds) {
      if (found != null) break;
      const outs = await Promise.all(Array.from({ length: spins }, (_, i) => slottOutcome(r.s, r.game_id, i + 1)));
      if (ok({ scores: outs.map((o) => o.score), wilds: outs.map((o) => o.wilds) })) found = Number(r.game_id);
    }
    await Promise.all(ids.filter((id) => id !== found).map((id) => cancel(uid, id)));
    if (found != null) return found;
  }
  throw new Error("no matching seed found");
}
const createWithWilds = (uid: string, stake: number, k: number) =>
  findGame(uid, stake, 12, ({ wilds }) => wilds.filter((w) => w > 0).length >= k);
async function scoresForSeed(id: number, n: number) {
  const seed = await seedOf(id);
  const out: number[] = [];
  for (let s = 1; s <= n; s++) out.push((await slottOutcome(seed, id, s)).score);
  return out;
}

async function assertInvariants() {
  const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const [unb] = await sql`select count(*)::int c from (select tx_id from pvp_test.ledger_postings group by tx_id having sum(amount) <> 0) x`;
  expect(unb.c).toBe(0);
  const [l] = await sql`select coalesce(sum(balance),0)::bigint v from pvp_test.wallet_accounts where kind='user_locked'`;
  const [o] = await sql`select coalesce(sum(case when status='WAITING' then stake else p2p_pot end),0)::bigint v
    from pvp_test.slot_games where status in ('WAITING','ACTIVE','SETTLEMENT')`;
  expect(Number(l.v)).toBe(Number(o.v));
  const [e] = await sql`select coalesce(sum(balance),0)::bigint v from pvp_test.wallet_accounts where kind='game_escrow'`;
  const [eb] = await sql`select coalesce(sum(bonus_total),0)::bigint v from pvp_test.slot_games where status in ('ACTIVE','SETTLEMENT')`;
  expect(Number(e.v)).toBe(Number(eb.v));
  const [r] = await sql`select coalesce(sum(reserved_cents),0)::bigint v from pvp_test.slot_bonus_budget`;
  const [ra] = await sql`select coalesce(sum(awarded_cents),0)::bigint v from pvp_test.slot_bonus_events where status <> 'RETURNED'`;
  expect(Number(r.v)).toBe(Number(ra.v));
  for (const g of await sql`select * from pvp_test.slot_games`) {
    const ents = await sql`select * from pvp_test.slot_entries where game_id = ${g.id} order by seat`;
    expect(ents.length).toBe(g.status === "WAITING" || g.status === "CANCELLED" ? 1 : 2);
    for (const en of ents) expect(Number(en.amount)).toBe(Number(g.stake));
    const kinds = await sql`select kind, count(*)::int c from pvp_test.ledger_transactions where game_id = ${g.id} and kind::text like 'slot_%' group by kind`;
    const k = Object.fromEntries(kinds.map((x) => [x.kind, x.c]));
    expect(k.slot_entry ?? 0).toBe(ents.length);
    const [ev] = await sql`select count(*)::int c, coalesce(sum(awarded_cents),0)::bigint s from pvp_test.slot_bonus_events where game_id = ${g.id}`;
    expect(k.slot_bonus ?? 0).toBe(ev.c);
    expect(Number(ev.s)).toBe(Number(g.bonus_total));
    if (g.status === "COMPLETED") {
      expect((k.slot_settlement ?? 0) + (k.slot_refund ?? 0)).toBe(1);
      const sp = await spinsOf(g.id);
      const v = await verifySlott({ id: g.id, server_seed_hash: g.server_seed_hash, server_seed: g.server_seed, score_a: g.score_a, score_b: g.score_b }, sp as never);
      expect(v.ok).toBe(true);
      const pays = await sql`select * from pvp_test.slot_payouts where game_id = ${g.id}`;
      if (g.outcome === "WIN") {
        expect(pays.length).toBe(1);
        expect(Number(pays[0]!.amount)).toBe(Number(g.p2p_pot) - Number(g.fee_amount) + Number(g.bonus_total));
      } else {
        expect(pays.length).toBe(2);
      }
    }
    if (g.status === "CANCELLED") expect(k.slot_refund ?? 0).toBe(1);
  }
}

d("P2P Slott engine (isolated schema)", { timeout: LONG }, () => {
  let START = 0;
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    // Tests exercise expiry in seconds; production keeps its 60s floor.
    await sql`alter table pvp_test.slot_config drop constraint slot_config_waiting_timeout_seconds_check`;
    await sql`grant usage on schema pvp_test to anon, authenticated`;
    await sql`grant execute on function pvp_test.test_uid() to anon, authenticated`;
  }, LONG);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });
  beforeEach(async () => {
    await sql`truncate pvp_test.audit_logs, pvp_test.slot_payouts, pvp_test.slot_bonus_events, pvp_test.slot_bonus_budget,
      pvp_test.slot_spins, pvp_test.slot_entries, pvp_test.slot_game_secrets, pvp_test.slot_games,
      pvp_test.ledger_postings, pvp_test.ledger_transactions, pvp_test.wallet_accounts, pvp_test.profiles restart identity cascade`;
    await setCfg();
    await setPromo();
    await setTiers(PROD_TIERS);
    const u = await newUser("probe");
    START = await bal(u);
  });

  it("SQL and the TypeScript verifier agree on grids, scores and weights", async () => {
    expect(SYMBOLS.reduce((a, s) => a + s.weight, 0)).toBe(WEIGHT_TOTAL);
    for (let i = 0; i < 3; i++) {
      const seed = randomBytes(32).toString("hex");
      for (const [gid, n] of [[1, 1], [7, 12], [123456789, 31]] as const) {
        const [r] = await sql`select * from pvp_test.slot_outcome(decode(${seed}, 'hex'), ${gid}::bigint, ${n})`;
        const t = await slottOutcome(seed, gid, n);
        expect(r!.grid.map(Number)).toEqual(t.grid);
        expect(r!.score).toBe(t.score);
        expect(r!.wilds).toBe(t.wilds);
        expect(r!.lines).toEqual(t.lines);
      }
    }
    const grids: number[][] = [
      Array(20).fill(7),
      Array(20).fill(0),
      Array.from({ length: 20 }, (_, i) => (i % 4 === 0 ? (i < 8 ? 7 : 17) : i % 20)),
      Array.from({ length: 20 }, (_, i) => [7, 3, 3, 3, 3][Math.floor(i / 4)]!),
    ];
    for (let i = 0; i < 40; i++) grids.push(Array.from({ length: 20 }, () => Math.floor(Math.random() * 20)));
    for (const g of grids) {
      const [r] = await sql`select * from pvp_test.slot_score_v1(${g}::smallint[])`;
      const t = scoreGrid(g);
      expect([r!.wilds, r!.base, r!.line_score]).toEqual([t.wilds, t.base, t.lineScore]);
      expect(r!.lines).toEqual(t.lines);
    }
    expect(scoreGrid(Array(20).fill(7)).lineScore).toBe(5 * 10 * 50);
  }, LONG);

  it("create locks the stake, commits the seed and snapshots config; join starts the match", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await create(a, 1000);
    let g = await game(game_id);
    expect(g.status).toBe("WAITING");
    expect(g.server_seed_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(g.server_seed).toBeNull();
    expect([Number(g.p2p_pot), Number(g.bonus_cap), g.fee_bps, g.base_spins]).toEqual([2000, 3000, 500, 12]);
    expect(await bal(a)).toBe(START - 1000);
    expect(await bal(a, "user_locked")).toBe(1000);
    await setCfg({ fee_bps: 0 });
    await joinG(b, game_id);
    g = await game(game_id);
    expect(g.status).toBe("ACTIVE");
    expect(g.fee_bps).toBe(500);
    expect(g.next_spin).toBe(1);
    expect(await bal(b)).toBe(START - 1000);
    const scaled = [];
    for (const s of [100, 500, 1000, 5000, 10000]) scaled.push(Number((await game((await create(a, s)).game_id)).bonus_cap));
    expect(scaled).toEqual([300, 1500, 3000, 15000, 30000]);
    await assertInvariants();
  });

  it("rejects invalid creates", async () => {
    const a = await newUser("alice");
    await expectErr(create(null, 500), "AUTH_REQUIRED");
    for (const bad of [0, 99, 10001, 999999]) await expectErr(create(a, bad), "INVALID_STAKE");
    const custom = await create(a, 150);
    expect(Number((await game(custom.game_id)).stake)).toBe(150);
    await expectErr(create(a, 500, "short"), "INVALID_IDEMPOTENCY_KEY");
    await expectErr(create(randomUUID(), 500), "PROFILE_REQUIRED");
    await sql`update pvp_test.slot_config set stakes = '{100,500,1000,2500,5000,10000,5000000}'`;
    await expectErr(create(a, 5000000), "INSUFFICIENT_BALANCE");
    await setCfg({ create_rate_limit: 3 });
    await create(a, 100);
    await create(a, 100);
    await expectErr(create(a, 100), "RATE_LIMITED");
    await setCfg({ max_open_per_user: 3 });
    await expectErr(create(a, 100), "TOO_MANY_OPEN_GAMES");
    await assertInvariants();
  });

  it("double-click create with one key makes one game and one debit; a reused key cannot change the stake", async () => {
    const a = await newUser("alice");
    const key = randomUUID();
    const rs = await Promise.all(Array.from({ length: 6 }, () => create(a, 500, key)));
    expect(new Set(rs.map((r) => r.game_id)).size).toBe(1);
    expect(rs.filter((r) => !r.duplicate).length).toBe(1);
    await expectErr(create(a, 1000, key), "IDEMPOTENCY_KEY_REUSED");
    expect(await bal(a)).toBe(START - 500);
    await assertInvariants();
  });

  it("joins: own game, unknown, poor, third player and simultaneous joiners", async () => {
    const [a, b, poor] = [await newUser("alice"), await newUser("bob"), await newUser("poor")];
    const others = await Promise.all(Array.from({ length: 6 }, (_, i) => newUser(`plr${i}`)));
    const { game_id } = await create(a, 500);
    await expectErr(joinG(a, game_id), "CANNOT_JOIN_OWN_GAME");
    await expectErr(joinG(null, game_id), "AUTH_REQUIRED");
    await expectErr(joinG(b, 999999), "GAME_NOT_FOUND");
    await sql`update pvp_test.slot_config set stakes = ${[100, 500, 1000, 2500, 5000, 10000, START]}::bigint[]`;
    await create(poor, START);
    await expectErr(joinG(poor, game_id), "INSUFFICIENT_BALANCE");
    const res = await Promise.allSettled(others.map((u) => joinG(u, game_id)));
    expect(res.filter((r) => r.status === "fulfilled").length).toBe(1);
    for (const r of res) if (r.status === "rejected") expect(String(r.reason)).toContain("GAME_NOT_JOINABLE");
    await expectErr(joinG(b, game_id), "GAME_NOT_JOINABLE");
    const [c] = await sql`select count(*)::int c from pvp_test.slot_entries where game_id = ${game_id}`;
    expect(c.c).toBe(2);
    await assertInvariants();
  });

  it("a full match alternates turns, rejects out-of-turn and replayed spins, and pays the winner", async () => {
    const [a, b, c] = [await newUser("alice"), await newUser("bob"), await newUser("carol")];
    await setCfg({ pre_delay_ms: 5000, spin_ms: 4000 });
    const { game_id: id } = await create(a, 1000);
    await joinG(b, id);
    await expectErr(spin(a, id, 1), "TURN_NOT_OPEN");
    await openTurn(id);
    await expectErr(spin(b, id, 1), "NOT_YOUR_TURN");
    await expectErr(spin(c, id, 1), "NOT_A_PLAYER");
    await expectErr(spin(a, id, 2), "STALE_ACTION");
    await expectErr(spin(a, id, 1, "short"), "INVALID_IDEMPOTENCY_KEY");
    const key = randomUUID();
    const first = await spin(a, id, 1, key);
    expect(first.duplicate).toBe(false);
    expect(first.grid).toHaveLength(20);
    // Same key → same spin; new key for the same logical spin → same spin, never a second one.
    const again = await Promise.all([spin(a, id, 1, key), spin(a, id, 1, key), spin(a, id, 1)]);
    for (const r of again) expect([r.duplicate, r.spin_no, r.score]).toEqual([true, 1, first.score]);
    await expectErr(spin(a, id, 3, key), "IDEMPOTENCY_KEY_REUSED");
    await expectErr(spin(a, id, 2), "NOT_YOUR_TURN");
    expect((await spinsOf(id)).length).toBe(1);
    // Revealing the result waits for the reel stop.
    await expectErr(spin(b, id, 2), "TURN_NOT_OPEN");

    const g = await playAll(id, a, b);
    expect(g.status).toBe("COMPLETED");
    const sp = await spinsOf(id);
    expect(sp.length).toBeGreaterThanOrEqual(12);
    for (const s of sp) expect(s.player_id).toBe(s.spin_no % 2 ? a : b);
    const scores = await scoresForSeed(id, sp.length);
    const sa = scores.filter((_, i) => i % 2 === 0).reduce((x, y) => x + y, 0);
    const sb = scores.filter((_, i) => i % 2 === 1).reduce((x, y) => x + y, 0);
    expect([g.score_a, g.score_b]).toEqual([sa, sb]);
    expect(g.server_seed).toMatch(/^[0-9a-f]{64}$/);
    if (g.outcome === "WIN") {
      const winner = sa > sb ? a : b;
      expect(g.winner_id).toBe(winner);
      expect([Number(g.fee_amount), Number(g.payout_amount)]).toEqual([100, 1900 + Number(g.bonus_total)]);
      expect(await bal(winner)).toBe(START - 1000 + 1900 + Number(g.bonus_total));
      expect(await bal(winner === a ? b : a)).toBe(START - 1000);
    } else {
      expect(await bal(a)).toBe(START);
    }
    expect(await bal(a, "user_locked")).toBe(0);
    expect(await bal(b, "user_locked")).toBe(0);
    await expectErr(spin(a, id, g.next_spin), "MATCH_NOT_ACTIVE");
    const leak = await sql`select 1 from pvp_test.audit_logs where details::text like ${"%" + g.server_seed + "%"}`;
    expect(leak.length).toBe(0);
    const acts = (await sql`select distinct action from pvp_test.audit_logs where game_id = ${id} and game_type = 'slot'`).map((x) => x.action);
    expect(acts).toEqual(expect.arrayContaining(["GAME_CREATED", "PLAYER_JOINED", "SPIN", "GAME_COMPLETED"]));
    await assertInvariants();
  }, LONG);

  it("the worker auto-spins for idle players, and a concurrent click and worker spin exactly once", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id: id } = await create(a, 500);
    await joinG(b, id);
    const opened = await game(id);
    // The creator may have been away while the match sat open. The first turn waits
    // a minute before auto-spin; later turns keep the short idle timer.
    expect(new Date(opened.turn_deadline).getTime() - new Date(opened.turn_opens_at).getTime()).toBeGreaterThanOrEqual(59_000);
    expect((await tick()).auto_spun).toBe(0);
    await expireTurn(id);
    const res = await Promise.allSettled([tick(), spin(a, id, 1), tick()]);
    expect(res.some((r) => r.status === "fulfilled")).toBe(true);
    expect((await spinsOf(id)).length).toBe(1);
    for (;;) {
      const g = await game(id);
      if (g.ends_at) break;
      await expireTurn(id);
      await tick();
    }
    await waitEnds(id);
    await tick();
    const g = await game(id);
    expect(g.status).toBe("COMPLETED");
    const auto = (await spinsOf(id)).filter((s) => s.auto);
    expect(auto.length).toBeGreaterThanOrEqual(11);
    for (const s of auto) expect(s.idempotency_key).toBeNull();
    await assertInvariants();
  }, LONG);

  for (const stake of [100, 10000]) {
    it(`WILD bonuses at $${stake / 100}: tiered, scaled, clamped, and paid to the winner from the shared pool`, async () => {
      await setTiers(TEST_TIERS);
      const [a, b] = [await newUser("alice"), await newUser("bob")];
      await setCfg({ max_event_bonus_cents: stake * 2 });
      const { game_id: id } = await create(a, stake);
      await joinG(b, id);
      const g = await playAll(id, a, b);
      expect(g.status).toBe("COMPLETED");
      const sp = await spinsOf(id);
      const wilds = await wildsForSeed(id, sp.length);
      const exp = expectedBonuses(stake, wilds, { tiers: TEST_TIERS, eventCap: stake * 2, matchCap: Number(g.bonus_cap), budgetLeft: 1_000_000, userLeft: 1_000_000 });
      expect(sp.map((s) => Number(s.bonus_cents))).toEqual(exp);
      expect(sp.map((s) => s.wild_count)).toEqual(wilds);
      const total = exp.reduce((x, y) => x + y, 0);
      expect(Number(g.bonus_total)).toBe(total);
      expect(total).toBeLessThanOrEqual(stake * 3);
      const ev = await sql`select * from pvp_test.slot_bonus_events where game_id = ${id} order by spin_no`;
      expect(ev.length).toBe(exp.filter((x) => x > 0).length);
      let pool = 2 * stake;
      for (const e of ev) {
        const s = sp.find((x) => x.spin_no === e.spin_no)!;
        expect(e.triggered_by).toBe(s.player_id);
        expect(Number(e.pool_before)).toBe(pool);
        pool += Number(e.awarded_cents);
        expect(Number(e.pool_after)).toBe(pool);
        expect(e.status).toBe(g.outcome === "WIN" ? "PAID" : "RETURNED");
        expect(TEST_TIERS.find((t) => t[1] === e.tier)![0]).toBeLessThanOrEqual(e.wild_count);
      }
      if (g.outcome === "WIN") {
        expect(Number(g.payout_amount)).toBe(2 * stake - Math.floor((2 * stake * 500) / 10000) + total);
        expect(await bal(g.winner_id)).toBe(START - stake + Number(g.payout_amount));
      }
      await assertInvariants();
    }, LONG);
  }

  it("the daily budget clamps bonuses and then skips them; nothing is created without a reservation", async () => {
    await setTiers(TEST_TIERS);
    await setPromo({ daily_budget_cents: 260 });
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const id = await createWithWilds(a, 1000, 2);
    await joinG(b, id);
    const g = await playAll(id, a, b);
    const sp = await spinsOf(id);
    const wilds = await wildsForSeed(id, sp.length);
    const exp = expectedBonuses(1000, wilds, { tiers: TEST_TIERS, eventCap: 30000, matchCap: Number(g.bonus_cap), budgetLeft: 260, userLeft: 1_000_000 });
    expect(sp.map((s) => Number(s.bonus_cents))).toEqual(exp);
    const [bud] = await sql`select * from pvp_test.slot_bonus_budget`;
    expect(Number(bud!.budget_cents)).toBe(260);
    expect(Number(bud!.reserved_cents)).toBe(g.outcome === "WIN" ? exp.reduce((x, y) => x + y, 0) : 0);
    if (wilds.filter((w) => w > 0).length > exp.filter((x) => x > 0).length) {
      const reasons = (await sql`select details->>'reason' r from pvp_test.audit_logs where game_id = ${id} and action = 'BONUS_SKIPPED'`).map((x) => x.r);
      expect(reasons).toContain("CAP_OR_BUDGET_EXHAUSTED");
    }
    await assertInvariants();
  }, LONG);

  it("per-user daily promotional exposure spans matches; the promo switch turns bonuses off", async () => {
    await setTiers(TEST_TIERS);
    await setPromo({ user_daily_cap_cents: 150 });
    const [a, b, c] = [await newUser("alice"), await newUser("bob"), await newUser("carol")];
    const id1 = await createWithWilds(a, 1000, 1);
    await joinG(b, id1);
    const g1 = await playAll(id1, a, b);
    const w1 = await wildsForSeed(id1, (await spinsOf(id1)).length);
    const e1 = expectedBonuses(1000, w1, { tiers: TEST_TIERS, eventCap: 30000, matchCap: Number(g1.bonus_cap), budgetLeft: 1_000_000, userLeft: 150 });
    expect((await spinsOf(id1)).map((s) => Number(s.bonus_cents))).toEqual(e1);
    const usedA = g1.outcome === "DRAW" ? 0 : e1.reduce((x, y) => x + y, 0);

    const id2 = await createWithWilds(c, 1000, 1);
    await joinG(a, id2);
    const g2 = await playAll(id2, c, a);
    const w2 = await wildsForSeed(id2, (await spinsOf(id2)).length);
    const e2 = expectedBonuses(1000, w2, { tiers: TEST_TIERS, eventCap: 30000, matchCap: Number(g2.bonus_cap), budgetLeft: 1_000_000, userLeft: 150 - usedA });
    expect((await spinsOf(id2)).map((s) => Number(s.bonus_cents))).toEqual(e2);

    await setPromo({ enabled: false });
    const id3 = await createWithWilds(b, 500, 1);
    await joinG(c, id3);
    const g3 = await playAll(id3, b, c);
    expect(Number(g3.bonus_total)).toBe(0);
    const reasons = (await sql`select details->>'reason' r from pvp_test.audit_logs where game_id = ${id3} and action = 'BONUS_SKIPPED'`).map((x) => x.r);
    expect(reasons.length).toBeGreaterThan(0);
    expect(new Set(reasons)).toEqual(new Set(["PROMO_DISABLED"]));
    await assertInvariants();
  }, 300_000);

  it("a tie goes to sudden death; a final tie refunds both stakes and returns every bonus to the budget", async () => {
    await setTiers(TEST_TIERS);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    // Find a seed that ties after two spins and carries a bonus; tests may read the committed seed.
    await setCfg({ base_spins: 2, max_spins: 2 });
    const draw = await findGame(a, 500, 2, ({ scores, wilds }) => scores[0] === scores[1] && wilds.some((x) => x > 0));
    await joinG(b, draw);
    const g = await playAll(draw!, a, b);
    expect([g.status, g.outcome, g.winner_id, Number(g.fee_amount), Number(g.payout_amount)]).toEqual(["COMPLETED", "DRAW", null, 0, 0]);
    expect(Number(g.bonus_total)).toBeGreaterThan(0);
    expect(await bal(a)).toBe(START);
    expect(await bal(b)).toBe(START);
    const ev = await sql`select status, return_tx_id from pvp_test.slot_bonus_events where game_id = ${draw}`;
    for (const e of ev) expect([e.status, !!e.return_tx_id]).toEqual(["RETURNED", true]);
    const [bud] = await sql`select coalesce(sum(reserved_cents),0)::bigint s from pvp_test.slot_bonus_budget`;
    expect(Number(bud.s)).toBe(0);
    await assertInvariants();

    // Sudden death: tie after the base spins continues in pairs.
    await setCfg({ base_spins: 2, max_spins: 6 });
    const sd = await findGame(a, 100, 4, ({ scores: s }) => s[0] === s[1] && s[2] !== s[3]);
    await joinG(b, sd);
    const g2 = await playAll(sd, a, b);
    expect(g2.status).toBe("COMPLETED");
    expect((await spinsOf(sd)).length).toBe(4);
    expect(g2.outcome).toBe("WIN");
    await assertInvariants();
  }, 300_000);

  it("WAITING matches expire once, creators can cancel, and cancel cannot beat a join", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    await setCfg({ waiting_timeout_seconds: 1 });
    const { game_id } = await create(a, 500);
    await sleep(1100);
    await expectErr(joinG(b, game_id), "GAME_EXPIRED");
    await Promise.all([tick(), tick(), tick()]);
    const g = await game(game_id);
    expect([g.status, g.cancel_reason]).toEqual(["CANCELLED", "EXPIRED"]);
    expect(await bal(a)).toBe(START);
    await setCfg();
    const { game_id: g2 } = await create(a, 100);
    await expectErr(cancel(b, g2), "FORBIDDEN");
    await cancel(a, g2);
    await expectErr(cancel(a, g2), "GAME_NOT_CANCELLABLE");
    expect(await bal(a)).toBe(START);
    const { game_id: g3 } = await create(a, 100);
    const res = await Promise.allSettled([cancel(a, g3), joinG(b, g3)]);
    expect(res.filter((r) => r.status === "fulfilled").length).toBe(1);
    const [n] = await sql`select count(*)::int c from pvp_test.ledger_transactions where kind = 'slot_refund' and game_id = ${game_id}`;
    expect(n.c).toBe(1);
    await assertInvariants();
  });

  it("injected settlement failures leave nothing half-paid; the next worker settles exactly once", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id: id } = await create(a, 500);
    await joinG(b, id);
    for (;;) {
      const g = await game(id);
      if (g.ends_at) break;
      await openTurn(id);
      await spin(g.next_spin % 2 ? a : b, id, g.next_spin);
    }
    await waitEnds(id);
    expect((await tick({ fail: true })).failed).toBe(1);
    let g = await game(id);
    expect([g.status, g.settle_attempts]).toEqual(["SETTLEMENT", 1]);
    expect(await bal(a, "user_locked")).toBe(500);
    await tick({ failBeforeComplete: true });
    expect((await game(id)).status).toBe("SETTLEMENT");
    const [n0] = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${id} and kind in ('slot_settlement','slot_refund')`;
    expect(n0.c).toBe(0);
    await assertInvariants();
    await Promise.all([tick(), tick(), tick()]);
    await tick();
    g = await game(id);
    expect(g.status).toBe("COMPLETED");
    const [n1] = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${id} and kind in ('slot_settlement','slot_refund')`;
    expect(n1.c).toBe(1);
    const acts = (await sql`select action from pvp_test.audit_logs where game_id = ${id} and game_type = 'slot'`).map((x) => x.action);
    expect(acts).toContain("SETTLEMENT_FAILED");
    await assertInvariants();
  }, LONG);

  it("the database rejects illegal transitions and edits to scores, pots, seeds and records", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id: id } = await create(a, 500);
    await expectErr(sql`update pvp_test.slot_games set status = 'COMPLETED' where id = ${id}`, "ILLEGAL_TRANSITION");
    await expectErr(sql`update pvp_test.slot_games set stake = 1, p2p_pot = 2 where id = ${id}`, "ILLEGAL_TRANSITION");
    await joinG(b, id);
    await expectErr(sql`update pvp_test.slot_games set stake = 1, p2p_pot = 2 where id = ${id}`, "IMMUTABLE_FIELD");
    await expectErr(sql`update pvp_test.slot_games set score_a = 999 where id = ${id}`, "SCORE_MISMATCH");
    await expectErr(sql`update pvp_test.slot_games set bonus_total = 100 where id = ${id}`, "BONUS_MISMATCH");
    await expectErr(sql`update pvp_test.slot_games set status = 'SETTLEMENT' where id = ${id}`, "TOO_EARLY");
    await expectErr(sql`update pvp_test.slot_games set server_seed_hash = repeat('0', 64) where id = ${id}`, "IMMUTABLE_FIELD");
    await openTurn(id);
    await spin(a, id, 1);
    await expectErr(sql`update pvp_test.slot_spins set score = score + 1 where game_id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`delete from pvp_test.slot_spins where game_id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`update pvp_test.slot_entries set amount = 1 where game_id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`update pvp_test.slot_game_secrets set server_seed = ${Buffer.alloc(32)} where game_id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(as(a, (tx) => tx`select pvp_test.slot_spin(${id}, 2, ${randomUUID()}, 999999)`), "does not exist");
    const g = await playAll(id, a, b);
    await expectErr(sql`update pvp_test.slot_games set winner_id = ${a} where id = ${id}`, "IMMUTABLE_RECORD");
    await expectErr(sql`update pvp_test.slot_payouts set amount = 1 where game_id = ${id}`, "IMMUTABLE_RECORD");
    expect(g.status).toBe("COMPLETED");
  }, LONG);

  it("browser roles: public match data only; no secrets, budget, payouts, internals or writes", async () => {
    await setTiers(TEST_TIERS);
    const [a, b, c] = [await newUser("alice"), await newUser("bob"), await newUser("carol")];
    const { game_id: id } = await create(a, 500);
    await joinG(b, id);
    await openTurn(id);
    await spin(a, id, 1);
    for (const role of ["anon", "authenticated"] as const) {
      const uid = role === "anon" ? null : c;
      const rows = await asRole(role, uid, (tx) => tx`select id, status, score_a, server_seed from pvp_test.slot_games where id = ${id}`);
      expect(rows.length).toBe(1);
      expect(rows[0]!.server_seed).toBeNull();
      const sp = await asRole(role, uid, (tx) => tx`select spin_no, grid, score from pvp_test.slot_spins where game_id = ${id}`);
      expect(sp.length).toBe(1);
      await asRole(role, uid, (tx) => tx`select id, tier, awarded_cents from pvp_test.slot_bonus_events`);
      await expectErr(asRole(role, uid, (tx) => tx`select idempotency_key from pvp_test.slot_spins`), "permission denied");
      await expectErr(asRole(role, uid, (tx) => tx`select ledger_tx_id from pvp_test.slot_bonus_events`), "permission denied");
      await expectErr(asRole(role, uid, (tx) => tx`select * from pvp_test.slot_game_secrets`), "permission denied");
      await expectErr(asRole(role, uid, (tx) => tx`update pvp_test.slot_games set score_a = 1 where id = ${id}`), "permission denied");
      await expectErr(asRole(role, uid, (tx) => tx`insert into pvp_test.slot_spins (game_id, spin_no) values (${id}, 2)`), "permission denied");
      await expectErr(asRole(role, uid, (tx) => tx`select pvp_test._slot_spin(${id}, ${uid}, true, null)`), "permission denied");
      await expectErr(asRole(role, uid, (tx) => tx`select pvp_test._slot_settle(${id})`), "permission denied");
      await expectErr(asRole(role, uid, (tx) => tx`select pvp_test.slot_advance(${id})`), "permission denied");
    }
    await expectErr(asRole("anon", null, (tx) => tx`select pvp_test.slot_spin(${id}, 2, ${randomUUID()})`), "permission denied");
    const empty = async (q: (tx: postgres.TransactionSql) => Promise<unknown[]>) => expect((await asRole("authenticated", c, q)).length).toBe(0);
    await empty((tx) => tx`select * from pvp_test.slot_bonus_budget`);
    await empty((tx) => tx`select * from pvp_test.slot_promo_config`);
    await empty((tx) => tx`select * from pvp_test.slot_payouts`);
    await empty((tx) => tx`select * from pvp_test.slot_entries where game_id = ${id}`);
    const own = await asRole("authenticated", a, (tx) => tx`select seat from pvp_test.slot_entries where game_id = ${id}`);
    expect(own.map((r) => r.seat)).toEqual(["A"]);
  }, LONG);

  it("stress: concurrent matches, duplicate clicks and workers keep every invariant", async () => {
    await setTiers(TEST_TIERS);
    const users = await Promise.all(Array.from({ length: 6 }, (_, i) => newUser(`str${i}`)));
    const ids = (await Promise.all([0, 1, 2].map((i) => create(users[i]!, [100, 500, 1000][i]!)))).map((r) => r.game_id);
    await Promise.all(ids.map((id, i) => joinG(users[i + 3]!, id)));
    for (let round = 0; round < 40; round++) {
      const gs = await Promise.all(ids.map(game));
      const live = gs.filter((g) => g.status === "ACTIVE" && !g.ends_at);
      if (!live.length) break;
      await Promise.all(live.map((g) => openTurn(g.id)));
      const res = await Promise.allSettled(
        live.flatMap((g) => {
          const i = ids.indexOf(Number(g.id));
          const p = g.next_spin % 2 ? users[i]! : users[i + 3]!;
          const k = randomUUID();
          return [spin(p, g.id, g.next_spin, k), spin(p, g.id, g.next_spin, k), spin(p, g.id, g.next_spin), tick()];
        }),
      );
      expect(res.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []))).toEqual([]);
    }
    await sleep(700);
    await Promise.all([tick(), tick()]);
    await tick();
    for (const id of ids) expect((await game(id)).status).toBe("COMPLETED");
    for (const id of ids) {
      const sp = await spinsOf(id);
      expect(sp.map((s) => s.spin_no)).toEqual(sp.map((_, i) => i + 1));
    }
    await assertInvariants();
  }, LONG);

  it("real-money domain: bonus comes from house_bankroll and settles to the winner in USD", async () => {
    await setTiers(TEST_TIERS);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    await migrateTestSchemaToReal(sql, { realPlay: true });
    for (const u of [a, b]) {
      await as(null, async (tx) => {
        const [t] = await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
          values ('deposit', ${"test-dep:" + u}, 'real', ${u}, 'test deposit') returning id`;
        await tx`select pvp_test._post(${t!.id}, pvp_test._system_account('external_custody', 'USD', 'real'), ${-REAL_DEPOSIT})`;
        await tx`select pvp_test._post(${t!.id}, pvp_test._user_account(${u}, 'user_available', 'USD', 'real'), ${REAL_DEPOSIT})`;
      });
    }
    let id = 0;
    id = await createWithWilds(a, 500, 1);
    const g0 = await game(id);
    expect([g0.account_type, g0.asset, g0.money_domain]).toEqual(["real", "USD", "REAL_USD"]);
    await joinG(b, id);
    const g = await playAll(id, a, b);
    expect(g.status).toBe("COMPLETED");
    expect(Number(g.bonus_total)).toBeGreaterThan(0);
    const [bank] = await sql`select coalesce(sum(p.amount),0)::bigint s from pvp_test.ledger_postings p
      join pvp_test.wallet_accounts w on w.id = p.account_id join pvp_test.ledger_transactions t on t.id = p.tx_id
      where w.kind = 'house_bankroll' and t.game_id = ${id} and t.kind::text like 'slot_%'`;
    expect(Number(bank.s)).toBe(g.outcome === "WIN" ? -Number(g.bonus_total) : 0);
    if (g.outcome === "WIN") expect(await bal(g.winner_id, "user_available", "real")).toBe(REAL_DEPOSIT - 500 + Number(g.payout_amount));
    const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts where account_type = 'real'`;
    expect(Number(s.s)).toBe(0);
  }, 300_000);
});
