/**
 * Withdraw basis under concurrency, without the global writer lock: one user's ledger
 * writes serialize, unrelated users do not, and the cache always equals a replay in
 * commit (seq) order. Real poker and jackpot settlement race slot-style ledger writes,
 * deposits, basis reads, rollbacks and rebuilds.
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { creditUserDeposit, fundTestTreasury, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 24, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
const LONG = 300_000;
const TRIALS = 8;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows and jsonb come back untyped
type Row = Record<string, any>;
type P = { id: string; links: string[] };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chain(n = 120) {
  const l = new Array<string>(n + 1);
  l[n] = randomBytes(32).toString("hex");
  for (let k = n; k > 0; k--)
    l[k - 1] = createHash("sha256").update(Buffer.from(l[k]!, "hex")).digest("hex");
  return l;
}
const as = <T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
  fail: "on" | null = null,
) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (fail) await tx`select set_config('pvp.fail_settlement', ${fail}, true)`;
    return fn(tx);
  }) as Promise<T>;
const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "";
  } catch (e) {
    return String((e as Error).message);
  }
};

let n = 0;
async function player(dep = 100_000): Promise<P> {
  const id = randomUUID();
  await as(
    id,
    (tx) => tx`select pvp_test.ensure_profile(${`wc${++n}${id.slice(0, 8)}`.slice(0, 20)}, true)`,
  );
  for (const k of ["user_available", "user_locked"])
    await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
      select ${id}::uuid, ${k}::pvp_test.account_kind, 'USD', 'real'
      where not exists (select 1 from pvp_test.wallet_accounts where owner_id = ${id}::uuid
        and kind = ${k}::pvp_test.account_kind and asset = 'USD' and account_type = 'real')`;
  if (dep > 0) await sql.begin((tx) => creditUserDeposit(tx, id, dep));
  return { id, links: chain() };
}

const acct = async (uid: string, kind: "user_available" | "user_locked") =>
  (
    await sql`select pvp_test._user_account(${uid}::uuid, ${kind}::pvp_test.account_kind, 'USD', 'real') id`
  )[0]!.id as string;
const sys = async (kind: string) =>
  (await sql`select pvp_test._system_account(${kind}::pvp_test.account_kind, 'USD', 'real') id`)[0]!
    .id as string;

/** One balanced real ledger tx; legs are posted in the given order. */
async function post(
  db: postgres.Sql | postgres.TransactionSql,
  kind: string,
  userId: string | null,
  legs: [string, number][],
  gameId: number | null = null,
): Promise<string> {
  if ("begin" in db) return db.begin((tx) => post(tx, kind, userId, legs, gameId)) as Promise<string>;
  const tx = (
    await db`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id)
      values (${kind}::pvp_test.tx_kind, ${randomUUID()}, 'real', ${userId}::uuid, ${gameId}) returning id`
  )[0]!.id as string;
  for (const [a, amt] of legs) await db`select pvp_test._post(${tx}::uuid, ${a}::uuid, ${amt}::bigint)`;
  return tx;
}

let custody = "";
let bankroll = "";
let revenue = "";
let nextGame = 9_000_000_000;
const bonus = async (db: postgres.Sql | postgres.TransactionSql, u: string, cents: number) =>
  post(db, "promo_reward", u, [
    [bankroll, -cents],
    [await acct(u, "user_available"), cents],
  ]);
const deposit = async (db: postgres.Sql | postgres.TransactionSql, u: string, cents: number) =>
  post(db, "deposit", u, [
    [custody, -cents],
    [await acct(u, "user_available"), cents],
  ]);
/** A withdrawal request moves funds to locked (basis hold); `refund` returns the latest one. */
const hold = async (db: postgres.Sql | postgres.TransactionSql, u: string, cents: number) =>
  post(db, "withdrawal", u, [
    [await acct(u, "user_available"), -cents],
    [await acct(u, "user_locked"), cents],
  ]);
const unhold = async (db: postgres.Sql | postgres.TransactionSql, u: string, cents: number) =>
  post(db, "refund", u, [
    [await acct(u, "user_locked"), -cents],
    [await acct(u, "user_available"), cents],
  ]);

/**
 * A slot-style game on its own synthetic id, run by one client so the game is
 * serialized the way a real game row lock serializes it: entries, then one settlement.
 */
async function slotGame(players: string[], stake: number, winner: number, fee = 0.05) {
  const g = nextGame++;
  for (const u of players)
    await post(
      sql,
      "slot_entry",
      u,
      [
        [await acct(u, "user_available"), -stake],
        [await acct(u, "user_locked"), stake],
      ],
      g,
    );
  const pot = stake * players.length;
  const cut = Math.floor(pot * fee);
  const legs: [string, number][] = [];
  for (const u of players) legs.push([await acct(u, "user_locked"), -stake]);
  legs.push([await acct(players[winner]!, "user_available"), pot - cut]);
  if (cut > 0) legs.push([revenue, cut]);
  // Like the real settlements: every participant's wallets first, in canonical order.
  await sql.begin(async (tx) => {
    await tx`select pvp_test._coinflip_lock_wallets(${players}::uuid[], 'USD', 'real')`;
    await post(tx, "slot_settlement", players[winner]!, legs, g);
  });
}

async function newTable(type = 1): Promise<number> {
  const r =
    await sql`insert into pvp_test.poker_tables (type_id, name, money_domain, asset, account_type,
      small_blind, big_blind, min_buy_in, max_buy_in, max_seats, fee_bps)
    select ty.id, 'basis', jc.money_domain, jc.asset, jc.account_type, ty.small_blind, ty.big_blind,
      ty.min_buy_in, ty.max_buy_in, ty.max_seats, c.fee_bps
    from pvp_test.poker_table_types ty, pvp_test.money_domain_config jc, pvp_test.poker_config c
    where ty.id = ${type} returning id`;
  return Number(r[0]!.id);
}
const sit = (p: P, table: number, buy = 500, head?: string) =>
  as(
    p.id,
    (
      tx,
    ) => tx`select pvp_test.poker_sit(${table}::bigint, null::smallint, null::smallint, ${buy}::bigint,
      ${head ?? p.links[0]!}, ${randomUUID()}) r`,
  ).then((r) => r[0]!.r as Row);
const leave = (p: P, t: number) => as(p.id, (tx) => tx`select pvp_test.poker_leave(${t}::bigint)`);
const latest = async (t: number) =>
  (
    await sql`select * from pvp_test.poker_hands where table_id = ${t} order by id desc limit 1`
  )[0] as Row | undefined;
async function revealAll(h: number | string, ps: P[]) {
  const rows =
    await sql`select user_id, link from pvp_test.poker_hand_players where hand_id = ${h}::bigint and reveal is null`;
  for (const r of rows) {
    const p = ps.find((x) => x.id === r.user_id)!;
    const i = p.links.indexOf(r.link);
    await as(p.id, (tx) => tx`select pvp_test.poker_reveal(${h}::bigint, ${p.links[i + 1]!})`);
  }
}
const act = (p: P, h: Row, a: string, amt = 0, fail: "on" | null = null) =>
  as(
    p.id,
    (tx) =>
      tx`select pvp_test.poker_act(${h.id}::bigint, ${h.version}::int, ${a}, ${amt}::bigint, ${randomUUID()}) r`,
    fail,
  );
const actor = async (h: Row, ps: P[]) => {
  const r = (
    await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id} and seat_no = ${h.to_act}`
  )[0]!;
  return ps.find((x) => x.id === r.user_id)!;
};
async function bettingHand(t: number, ps: P[]) {
  for (let i = 0; i < 40; i++) {
    const h = await latest(t);
    if (h?.status === "BETTING") return h;
    if (h?.status === "COMMIT") {
      await revealAll(h.id, ps);
      continue;
    }
    if (h?.next_hand_at) {
      const ms = +new Date(h.next_hand_at) - Date.now() + 50;
      if (ms > 0) await sleep(ms);
    }
    await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${t}`;
    await sql`select pvp_test._poker_tick_one(${t}::bigint)`;
  }
  throw new Error("NO_BETTING_HAND");
}

async function jackpotRound(users: string[], amount = 1000) {
  for (const u of users)
    await as(u, (tx) => tx`select pvp_test.jackpot_join(${amount}, ${randomUUID()})`);
  const g = (
    await sql`select id from pvp_test.jackpot_games where status in ('WAITING','ACTIVE') order by id desc limit 1`
  )[0]!;
  await sql`update pvp_test.jackpot_games set scheduled_end_at = clock_timestamp() - interval '1 second'
    where id = ${g.id}`;
  return Number(g.id);
}
const settleJackpot = (g: number) =>
  as(null, (tx) => tx`select pvp_test.jackpot_settle(${g}::bigint) r`);

const deadlocks = async () => {
  await sleep(1200);
  return Number(
    (
      await sql`select pg_stat_clear_snapshot(), (select deadlocks from pg_stat_database where datname = current_database()) d`
    )[0]!.d,
  );
};
const buckets = async () =>
  (await sql`select pvp_test._withdraw_basis_buckets_json() b`)[0]!.b as Record<string, Row>;

/** Cache equals the seq-order replay, and every committed real tx was applied exactly once. */
async function parity() {
  await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  const [r] = await sql`select
      (select count(*) from pvp_test.ledger_transactions where account_type = 'real')::int txs,
      (select count(*) from pvp_test.withdraw_basis_applied)::int applied,
      pvp_test._withdraw_basis_has_pending() pending`;
  expect(r).toEqual({ txs: r!.applied, applied: r!.applied, pending: false });
}

/** The old implementation's order: replay by (created_at, id). Rolled back. */
async function createdAtReplay(): Promise<Record<string, Row>> {
  let out: Record<string, Row> = {};
  await sql
    .begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext('withdraw-basis-sync'))`;
      await tx`truncate pvp_test.withdraw_basis_bucket, pvp_test.withdraw_basis_stake,
        pvp_test.withdraw_basis_hold, pvp_test.withdraw_basis_ledger_stake restart identity`;
      await tx`select pvp_test._withdraw_basis_apply_tx(t.id, t.kind::text, t.game_id)
        from (select id, kind, game_id from pvp_test.ledger_transactions
              where account_type = 'real' order by created_at, id) t`;
      await tx`delete from pvp_test.withdraw_basis_stake ws using pvp_test.poker_seats ps
        where ws.game = 'poker' and ws.game_id = ps.id and ws.user_id = ps.user_id
          and ps.status = 'CLOSED' and ps.close_ledger_tx is null`;
      out = (await tx`select pvp_test._withdraw_basis_buckets_json() b`)[0]!.b as Record<string, Row>;
      throw new Error("ROLLBACK");
    })
    .catch((e) => {
      if ((e as Error).message !== "ROLLBACK") throw e;
    });
  return out;
}

/**
 * Money conservation per user with nothing in play: bucket eligible + bonus, open
 * stakes and withdrawal holds add up to the wallet balance, to the cent.
 */
async function conservation(users: string[]) {
  const rows = await sql`
    select u.id::text uid,
      coalesce((select sum(balance) from pvp_test.wallet_accounts w where w.owner_id = u.id
        and w.account_type = 'real' and w.kind in ('user_available','user_locked')), 0)::bigint wallet,
      coalesce((select eligible + bonus from pvp_test.withdraw_basis_bucket b where b.user_id = u.id), 0)
      + coalesce((select sum(eligible + bonus) from pvp_test.withdraw_basis_stake s where s.user_id = u.id), 0)
      + coalesce((select sum(eligible_part + bonus_part) from pvp_test.withdraw_basis_hold h where h.user_id = u.id), 0)
        as basis,
      (select count(*) from pvp_test.poker_seats ps where ps.user_id = u.id and ps.status <> 'CLOSED')::int open_seats
    from unnest(${users}::uuid[]) u(id)`;
  for (const r of rows) {
    expect(r.open_seats, r.uid).toBe(0);
    expect({ u: r.uid, basis: Number(r.basis) }).toEqual({ u: r.uid, basis: Number(r.wallet) });
  }
}
async function ledgerBalanced() {
  const [r] = await sql`select
      (select coalesce(sum(balance), 0) from pvp_test.wallet_accounts where account_type = 'real')::bigint total,
      (select count(*) from (select a.id from pvp_test.wallet_accounts a
        left join pvp_test.ledger_postings p on p.account_id = a.id
        group by a.id, a.balance having a.balance <> coalesce(sum(p.amount), 0)) m)::int drift,
      (select count(*) from (select tx_id from pvp_test.ledger_postings group by tx_id
        having sum(amount) <> 0) x)::int unbalanced`;
  expect(r).toEqual({ total: "0", drift: 0, unbalanced: 0 });
}

/** A transaction held open after `fn` until `finish(commit)`; always ends, even on failure. */
function openTx(fn: (tx: postgres.TransactionSql) => Promise<unknown>) {
  let gate!: (commit: boolean) => void;
  let ready!: () => void;
  const opened = new Promise<void>((r) => (ready = r));
  const held = new Promise<boolean>((r) => (gate = r));
  const done = sql
    .begin(async (tx) => {
      await fn(tx);
      ready();
      if (!(await held)) throw new Error("ROLLBACK");
    })
    .catch((e) => {
      if ((e as Error).message !== "ROLLBACK") throw e;
    });
  return {
    opened: Promise.race([opened, done]),
    finish: (commit: boolean) => {
      gate(commit);
      return done;
    },
  };
}

/** Resolves after `ms` with "pending" unless `p` settles first. */
const within = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p.then(() => "done"), sleep(ms).then(() => "pending")]);

d("withdraw basis per-user concurrency", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await fundTestTreasury(sql);
    for (const k of ["game_escrow", "house_revenue", "house_bankroll"])
      await sql`select pvp_test._system_account(${k}::pvp_test.account_kind, 'USD', 'real')`;
    await sql`update pvp_test.poker_config set enabled = true, reveal_seconds = 5, action_seconds = 20,
      showdown_seconds = 1, between_hands_seconds = 1, runout_street_seconds = 0, max_active_tables = 500,
      buy_in_rate_limit = 10000, rpc_rate_limit = 100000`;
    await sql`update pvp_test.jackpot_config set entry_rate_limit = 100000`;
    custody = await sys("external_custody");
    bankroll = await sys("house_bankroll");
    revenue = await sys("house_revenue");
  }, 600_000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it(
    "sequential workload: cache equals the old created_at replay and the seq replay",
    async () => {
      const us = [await player(5000), await player(0), await player(3000)];
      await bonus(sql, us[1]!.id, 4000);
      await deposit(sql, us[1]!.id, 1500);
      await slotGame([us[0]!.id, us[1]!.id, us[2]!.id], 2000, 1);
      await hold(sql, us[0]!.id, 1200);
      await bonus(sql, us[0]!.id, 300);
      await slotGame([us[0]!.id, us[2]!.id], 500, 0);
      await unhold(sql, us[0]!.id, 1200);
      await parity();
      expect(await createdAtReplay()).toEqual(await buckets());
      await conservation(us.map((u) => u.id));
      await ledgerBalanced();
    },
    LONG,
  );

  it(
    "same user: a second ledger write waits for the first to commit, then both apply once",
    async () => {
      for (let k = 0; k < TRIALS; k++) {
        const u = await player(10_000);
        const b0 = (await buckets())[u.id]!;
        const a = openTx((tx) => deposit(tx, u.id, 700));
        await a.opened;
        let second: Promise<unknown>;
        let read: Promise<Row[]>;
        try {
          second = bonus(sql, u.id, 300);
          expect(await within(second, 400)).toBe("pending");
          // A basis read for the same user also waits, then sees both.
          read = sql`select pvp_test._withdraw_basis(${u.id}::uuid) b`.then((r) => [...r]);
          expect(await within(read, 200)).toBe("pending");
          await a.finish(true);
        } finally {
          await a.finish(false);
        }
        await second!;
        const seen = (await read!)[0]!.b as Row;
        expect([Number(seen.deposits), Number(seen.eligible), Number(seen.bonus)]).toEqual([
          Number(b0.deposits) + 700,
          Number(b0.eligible) + 700,
          Number(b0.bonus) + 300,
        ]);
      }
      await parity();
    },
    LONG,
  );

  it(
    "unrelated users: writes and basis reads proceed while another user's tx stays open",
    async () => {
      const lat: number[] = [];
      for (let k = 0; k < TRIALS; k++) {
        const [u, v] = [await player(10_000), await player(10_000)];
        const t = await newTable();
        const g = nextGame++;
        const [va, vl] = [await acct(v.id, "user_available"), await acct(v.id, "user_locked")];
        const a = openTx((tx) => deposit(tx, u.id, 900));
        await a.opened;
        try {
          const t0 = performance.now();
          // None of these share a row with the open tx: under the old global lock all waited.
          const work = (async () => {
            await post(
              sql,
              "slot_entry",
              v.id,
              [
                [va, -400],
                [vl, 400],
              ],
              g,
            );
            await sit(v, t, 500);
            await sql`select pvp_test._withdraw_basis(${v.id}::uuid)`;
          })();
          expect(await within(work, 5000)).toBe("done");
          await work;
          lat.push(performance.now() - t0);
          await a.finish(true);
        } finally {
          await a.finish(false);
        }
        await post(
          sql,
          "slot_refund",
          v.id,
          [
            [await acct(v.id, "user_locked"), -400],
            [await acct(v.id, "user_available"), 400],
          ],
          g,
        );
        await leave(v, t);
      }
      expect(Math.max(...lat)).toBeLessThan(2000);
      await parity();
    },
    LONG,
  );

  it(
    "real poker settlements race slot-style games, deposits and holds for the same and other users",
    async () => {
      const d0 = await deadlocks();
      const everyone: string[] = [];
      for (let k = 0; k < TRIALS; k++) {
        const ps = [await player(), await player(), await player(), await player()];
        const extra = [await player(20_000), await player(20_000)];
        everyone.push(...ps.map((p) => p.id), ...extra.map((p) => p.id));
        await bonus(sql, ps[0]!.id, 2500);
        const [t1, t2] = [await newTable(), await newTable()];
        await sit(ps[0]!, t1);
        await sit(ps[1]!, t1);
        await sit(ps[2]!, t2);
        await sit(ps[3]!, t2);
        const h1 = await bettingHand(t1, [ps[0]!, ps[1]!]);
        const h2 = await bettingHand(t2, [ps[2]!, ps[3]!]);
        const res = await Promise.all([
          err(act(await actor(h1, ps), h1, "FOLD")),
          err(act(await actor(h2, ps), h2, "FOLD")),
          err(slotGame([ps[0]!.id, extra[0]!.id], 700, 1)),
          err(slotGame([ps[3]!.id, extra[1]!.id], 300, 0)),
          err(slotGame([extra[0]!.id, extra[1]!.id], 900, 0)),
          err(deposit(sql, ps[1]!.id, 1100)),
          err(hold(sql, ps[2]!.id, 800)),
          err(bonus(sql, extra[1]!.id, 250)),
          err(sql`select pvp_test._withdraw_basis(${ps[0]!.id}::uuid)`),
        ]);
        expect(res).toEqual(res.map(() => ""));
        await unhold(sql, ps[2]!.id, 800);
        const out = await Promise.all([
          err(leave(ps[0]!, t1)),
          err(leave(ps[1]!, t1)),
          err(leave(ps[2]!, t2)),
          err(leave(ps[3]!, t2)),
          err(slotGame([ps[1]!.id, ps[2]!.id], 400, 1)),
        ]);
        expect(out).toEqual(out.map(() => ""));
      }
      expect((await deadlocks()) - d0).toBe(0);
      expect((await sql`select pvp_test.poker_reconcile() r`)[0]!.r.ok).toBe(true);
      await parity();
      await conservation(everyone);
      await ledgerBalanced();
    },
    LONG,
  );

  it(
    "deposits and basis reads race a cash-only buy-in and a cash-out by the same player",
    async () => {
      const d0 = await deadlocks();
      const everyone: string[] = [];
      const outcomes: string[] = [];
      for (let k = 0; k < TRIALS; k++) {
        // 1000 cash + 5000 bonus: a 2000 buy-in is cash-only, so it passes only if the
        // concurrent 1500 deposit is already in the basis when the buy-in checks it.
        const u = await player(1000);
        const v = await player();
        everyone.push(u.id, v.id);
        await bonus(sql, u.id, 5000);
        // t1 seats 1000-2500, t2 200-500.
        const [t1, t2] = [await newTable(3), await newTable()];
        await sit({ id: u.id, links: chain() }, t2, 500);
        await sit(v, t1, 1000);
        const before = await sql`select pvp_test._withdraw_basis(${u.id}::uuid) b`;
        expect(Number(before[0]!.b.eligible)).toBe(500);
        const [buy, , , cash] = await Promise.all([
          err(sit(u, t1, 2000)),
          err(deposit(sql, u.id, 1500)),
          err(sql`select pvp_test._withdraw_basis(${u.id}::uuid)`),
          err(leave(u, t2)),
        ]);
        expect(cash).toBe("");
        expect(["", "CASH_ONLY_BUY_IN"]).toContain(buy.replace(/^.*(CASH_ONLY_BUY_IN).*$/, "$1"));
        outcomes.push(buy === "" ? "seated" : "refused");
        const seated = (
          await sql`select count(*)::int c from pvp_test.poker_seats where user_id = ${u.id}::uuid
            and table_id = ${t1} and status <> 'CLOSED'`
        )[0]!.c;
        expect(seated).toBe(buy === "" ? 1 : 0);
        if (buy === "") {
          // The stake recorded for the buy-in is entirely cash.
          const [s] = await sql`select eligible, bonus from pvp_test.withdraw_basis_stake
            where user_id = ${u.id}::uuid and game = 'poker' and game_id = (select id from pvp_test.poker_seats
              where user_id = ${u.id}::uuid and table_id = ${t1} and status <> 'CLOSED')`;
          expect([Number(s!.eligible), Number(s!.bonus)]).toEqual([2000, 0]);
          await leave(u, t1);
        }
        await leave(v, t1);
      }
      expect((await deadlocks()) - d0).toBe(0);
      await parity();
      await conservation(everyone);
      await ledgerBalanced();
      console.log(JSON.stringify({ cash_only_buy_in_race: outcomes }));
    },
    LONG,
  );

  it(
    "cash-only buy-in, both orders: waits for an open deposit and uses it, or refuses without it",
    async () => {
      for (let k = 0; k < TRIALS; k++) {
        const u = await player(500);
        await bonus(sql, u.id, 5000);
        const t = await newTable(3);
        const ledger0 = (
          await sql`select count(*)::int c from pvp_test.ledger_transactions where user_id = ${u.id}::uuid`
        )[0]!.c;

        // No cash: refused, nothing written, basis unchanged.
        const b0 = (await buckets())[u.id];
        expect(await err(sit({ id: u.id, links: chain() }, t, 2000))).toMatch(/CASH_ONLY_BUY_IN/);
        expect((await buckets())[u.id]).toEqual(b0);
        expect(
          (
            await sql`select count(*)::int c from pvp_test.ledger_transactions where user_id = ${u.id}::uuid`
          )[0]!.c,
        ).toBe(ledger0);

        // A deposit still open: the buy-in waits on the wallet, then sees the cash.
        const a = openTx((tx) => deposit(tx, u.id, 1500));
        await a.opened;
        let buy: Promise<string>;
        try {
          buy = err(sit(u, t, 2000));
          expect(await within(buy, 400)).toBe("pending");
          await a.finish(true);
        } finally {
          await a.finish(false);
        }
        expect(await buy!).toBe("");
        const [s] = await sql`select eligible, bonus from pvp_test.withdraw_basis_stake
          where user_id = ${u.id}::uuid and game = 'poker' and game_id = (select id from pvp_test.poker_seats
            where user_id = ${u.id}::uuid and table_id = ${t} and status <> 'CLOSED')`;
        expect([Number(s!.eligible), Number(s!.bonus)]).toEqual([2000, 0]);
        await leave(u, t);
        await conservation([u.id]);
      }
      await parity();
    },
    LONG,
  );

  it(
    "jackpot multi-user settlement races poker settlement and cash-out of the same players",
    async () => {
      const d0 = await deadlocks();
      const everyone: string[] = [];
      for (let k = 0; k < TRIALS; k++) {
        const ps = [await player(), await player(), await player()];
        everyone.push(...ps.map((p) => p.id));
        const t = await newTable();
        await sit(ps[0]!, t);
        await sit(ps[1]!, t);
        const g = await jackpotRound(
          ps.map((p) => p.id),
          1000 + k,
        );
        const h = await bettingHand(t, [ps[0]!, ps[1]!]);
        const res = await Promise.all([
          err(settleJackpot(g)),
          err(act(await actor(h, ps), h, "FOLD")),
          err(slotGame([ps[2]!.id, ps[0]!.id], 600, k % 2)),
          err(deposit(sql, ps[1]!.id, 400)),
        ]);
        expect(res).toEqual(res.map(() => ""));
        const [jg] = await sql`select g.status, p.last_error from pvp_test.jackpot_games g
          left join pvp_test.jackpot_payouts p on p.game_id = g.id where g.id = ${g}`;
        expect(jg!.status, String(jg!.last_error)).toBe("COMPLETED");
        await Promise.all([leave(ps[0]!, t), leave(ps[1]!, t)]);
      }
      expect((await deadlocks()) - d0).toBe(0);
      await parity();
      await conservation(everyone);
      await ledgerBalanced();
    },
    LONG,
  );

  it(
    "rolled-back settlements, subtransactions and early flushes leave no basis effect behind",
    async () => {
      const u = await player(8000);
      const v = await player(8000);
      const b0 = (await buckets())[u.id]!;

      // A settlement attempt that fails rolls back its ledger tx and its basis effect.
      const t = await newTable();
      await sit(u, t);
      await sit(v, t);
      const h = await bettingHand(t, [u, v]);
      const who = await actor(h, [u, v]);
      expect(await err(act(who, h, "FOLD", 0, "on"))).toBe("");
      const failed = (await sql`select status, settle_attempts from pvp_test.poker_hands where id = ${h.id}`)[0]!;
      expect(failed.status).not.toBe("COMPLETED");
      await parity();
      await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${t}`;
      await sql`select pvp_test._poker_tick_one(${t}::bigint)`;
      expect((await sql`select status from pvp_test.poker_hands where id = ${h.id}`)[0]!.status).toBe(
        "COMPLETED",
      );
      await parity();

      // Savepoint rollback: the rolled-back deposit is never applied, the kept one once.
      await sql.begin(async (tx) => {
        await tx.savepoint(async (sp) => {
          await deposit(sp, u.id, 111);
          throw new Error("undo");
        }).catch(() => {});
        await deposit(tx, u.id, 222);
        // A mid-transaction read flushes the kept deposit; commit must not apply it again.
        const mid = (await tx`select pvp_test._withdraw_basis(${u.id}::uuid) b`)[0]!.b as Row;
        expect(Number(mid.deposits)).toBe(Number(b0.deposits) + 222);
        await bonus(tx, u.id, 33);
      });
      const b1 = (await buckets())[u.id]!;
      expect([Number(b1.deposits), Number(b1.bonus) - Number(b0.bonus)]).toEqual([
        Number(b0.deposits) + 222,
        33,
      ]);

      // A whole transaction that aborts after an early flush leaves nothing.
      await err(
        sql.begin(async (tx) => {
          await deposit(tx, u.id, 5555);
          await tx`select pvp_test._withdraw_basis_sync()`;
          throw new Error("abort");
        }),
      );
      expect(Number((await buckets())[u.id]!.deposits)).toBe(Number(b0.deposits) + 222);
      await Promise.all([leave(u, t), leave(v, t)]);
      await parity();
      await conservation([u.id, v.id]);
    },
    LONG,
  );

  it(
    "rebuild during concurrent writes waits for in-flight work, and parity holds afterwards",
    async () => {
      const d0 = await deadlocks();
      const us = await Promise.all(Array.from({ length: 6 }, () => player(30_000)));
      const errors: string[] = [];
      for (let k = 0; k < TRIALS; k++) {
        const res = await Promise.all([
          err(slotGame([us[0]!.id, us[1]!.id], 300, k % 2)),
          err(slotGame([us[2]!.id, us[3]!.id, us[4]!.id], 200, k % 3)),
          err(deposit(sql, us[5]!.id, 100)),
          err(bonus(sql, us[1]!.id, 50)),
          err(hold(sql, us[4]!.id, 100).then(() => unhold(sql, us[4]!.id, 100))),
          err(sql`select pvp_test._withdraw_basis_rebuild_full()`),
          err(sql`select pvp_test._withdraw_basis(${us[2]!.id}::uuid)`),
        ]);
        errors.push(...res.filter(Boolean));
      }
      expect(errors).toEqual([]);
      expect((await deadlocks()) - d0).toBe(0);
      await parity();
      await conservation(us.map((u) => u.id));
      await ledgerBalanced();
      // Same-user work did overlap in time, so the old created_at order may legitimately
      // differ from the real (seq) order; record how often, for the report.
      const ref = await createdAtReplay();
      const live = await buckets();
      const diff = Object.keys(live).filter((k) => JSON.stringify(live[k]) !== JSON.stringify(ref[k]));
      console.log(JSON.stringify({ created_at_vs_seq_bucket_diffs: diff.length, users: Object.keys(live).length }));
    },
    LONG,
  );
});
