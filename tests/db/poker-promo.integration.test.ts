/**
 * Poker and promo credits: the same rules as the other games.
 * Buy-ins spend eligible cash first, then bonus. Each hand mixes eligible/bonus the way a
 * pot does, so bonus lost to a depositor stays bonus. Flop hands count toward promo,
 * referral and leaderboard-prize playthrough. Partner losses to regular players are held.
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { applyTestSchema } from "./schema";
import { creditUserDeposit, migrateTestSchemaToReal } from "./money";
import { promoTestIp } from "./promo-client-ip";
import { testDatabaseUrl } from "./test-url";
import { buildChain } from "../../src/lib/fairness/poker";

const url = testDatabaseUrl();
const sql = postgres(url, { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 });
const LONG = 240_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows and jsonb come back untyped
type Row = Record<string, any>;
type Player = { id: string; links: string[] };
type Legal = { can_check: boolean; can_raise: boolean; min_raise_to: number };
type Move = (la: Legal) => [string, number?];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const as = <T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;

let n = 0;
async function player(deposit: number, bonus = 0): Promise<Player> {
  const id = randomUUID();
  await as(
    id,
    (tx) => tx`select pvp_test.ensure_profile(${`pp${++n}${id.slice(0, 8)}`.slice(0, 20)}, true)`,
  );
  for (const kind of ["user_available", "user_locked"])
    await sql`select pvp_test._user_account(${id}::uuid, ${kind}::pvp_test.account_kind, 'USD', 'real')`;
  if (deposit) await sql.begin((tx) => creditUserDeposit(tx, id, deposit));
  if (bonus) await credit(id, bonus, "promo_reward");
  return { id, links: await buildChain(randomBytes(32).toString("hex"), 80) };
}
async function credit(uid: string, cents: number, kind: string) {
  await sql.begin(async (tx) => {
    const t = (
      await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
        values (${kind}::pvp_test.tx_kind, ${randomUUID()}, 'real', ${uid}::uuid) returning id`
    )[0]!.id;
    await tx`select pvp_test._post(${t}::uuid, pvp_test._system_account('house_bankroll', 'USD', 'real'), ${-cents}::bigint)`;
    await tx`select pvp_test._post(${t}::uuid, pvp_test._user_account(${uid}::uuid, 'user_available', 'USD', 'real'), ${cents}::bigint)`;
  });
}
const bal = async (uid: string) =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid}::uuid
        and kind = 'user_available' and asset = 'USD' and account_type = 'real'`
    )[0]?.balance ?? 0,
  );
const bucket = async (uid: string) => {
  const [b] =
    await sql`select eligible, bonus from pvp_test.withdraw_basis_bucket where user_id = ${uid}::uuid`;
  return { eligible: Number(b?.eligible ?? 0), bonus: Number(b?.bonus ?? 0) };
};
const seatStake = async (uid: string, table: number) => {
  const [s] = await sql`select s.eligible, s.bonus from pvp_test.withdraw_basis_stake s
    join pvp_test.poker_seats ps on ps.id = s.game_id and ps.user_id = s.user_id
    where s.game = 'poker' and s.user_id = ${uid}::uuid and ps.table_id = ${table} and ps.status <> 'CLOSED'`;
  return { eligible: Number(s?.eligible ?? 0), bonus: Number(s?.bonus ?? 0) };
};
const parity = () =>
  sql.begin(async (tx) => {
    await tx`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });

const sit = (p: Player, type: number | null, buyIn: number, table: number | null = null) =>
  as(
    p.id,
    (tx) => tx`select pvp_test.poker_sit(${table}::bigint, ${type}::smallint, null::smallint,
      ${buyIn}::bigint, ${p.links[0]!}, ${randomUUID()}) r`,
  ).then((r) => r[0]!.r as Row);
const leave = (p: Player, table: number) =>
  as(p.id, (tx) => tx`select pvp_test.poker_leave(${table}::bigint) r`);
const latest = async (table: number) =>
  (
    await sql`select * from pvp_test.poker_hands where table_id = ${table} order by id desc limit 1`
  )[0] as Row | undefined;

async function nextHand(table: number) {
  const last = await latest(table);
  if (last?.next_hand_at) {
    const ms = +new Date(last.next_hand_at) - Date.now() + 60;
    if (ms > 0) await sleep(ms);
  }
  await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table} and next_due_at is not null`;
  await as(null, (tx) => tx`select pvp_test.poker_tick()`);
}

/** Plays the table's next hand to completion, each player acting with its own move. */
async function playHand(table: number, players: Player[], moves: Map<string, Move>) {
  let h = await latest(table);
  for (let i = 0; i < 5 && !(h && ["COMMIT", "BETTING"].includes(h.status)); i++) {
    await nextHand(table);
    h = await latest(table);
  }
  for (let i = 0; i < 200; i++) {
    h = (await latest(table))!;
    if (h.status === "COMMIT") {
      const rows = await sql`select user_id, link from pvp_test.poker_hand_players
        where hand_id = ${h.id} and reveal is null`;
      for (const r of rows) {
        const p = players.find((x) => x.id === r.user_id)!;
        const next = p.links[p.links.indexOf(r.link) + 1]!;
        await as(p.id, (tx) => tx`select pvp_test.poker_reveal(${h!.id}::bigint, ${next})`);
      }
      continue;
    }
    if (h.status !== "BETTING") return h;
    const [hp] = await sql`select user_id from pvp_test.poker_hand_players
      where hand_id = ${h.id} and seat_no = ${h.to_act}`;
    const p = players.find((x) => x.id === hp!.user_id)!;
    const st = (
      await as(p.id, (tx) => tx`select pvp_test.poker_table_state(${table}::bigint) r`)
    )[0]!.r;
    const [action, amt] = moves.get(p.id)!(st.me.legal as Legal);
    let a = action;
    if (a === "RAISE" && Number(h.current_bet) === 0) a = "BET";
    await as(
      p.id,
      (tx) =>
        tx`select pvp_test.poker_act(${h!.id}::bigint, ${st.hand.version}::int, ${a}, ${amt ?? 0}::bigint, ${randomUUID()})`,
    );
  }
  throw new Error("HAND_DID_NOT_FINISH");
}

const foldToAnyBet: Move = (la) => (la.can_check ? ["CHECK"] : ["FOLD"]);
const raiser: Move = (la) =>
  la.can_raise ? ["RAISE", la.min_raise_to] : la.can_check ? ["CHECK"] : ["CALL"];
const passive: Move = (la) => (la.can_check ? ["CHECK"] : ["CALL"]);

async function admin() {
  const id = randomUUID();
  await as(
    id,
    (tx) => tx`select pvp_test.ensure_profile(${`adm${id.replace(/-/g, "").slice(0, 12)}`}, true)`,
  );
  const session = randomUUID();
  const device = randomUUID();
  await sql`insert into pvp_test.user_roles (user_id, role) values (${id}::uuid, 'admin')`;
  await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
    values (${device}::uuid, ${id}::uuid, ${randomBytes(32).toString("hex")}, clock_timestamp())`;
  await sql`insert into pvp_test.test_auth_sessions (id, user_id) values (${session}::uuid, ${id}::uuid)`;
  await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
    values (${session}::uuid, ${id}::uuid, ${device}::uuid)`;
  return { id, claims: JSON.stringify({ role: "authenticated", sub: id, session_id: session }) };
}

describe("poker promo parity", () => {
  beforeAll(async () => {
    await applyTestSchema(sql);
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    for (const k of ["game_escrow", "house_revenue", "house_bankroll"])
      await sql`select pvp_test._system_account(${k}::pvp_test.account_kind, 'USD', 'real')`;
    await sql`update pvp_test.wallet_accounts set balance = 100000000
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
    await sql`update pvp_test.poker_config set enabled = true, reveal_seconds = 2, action_seconds = 5,
      showdown_seconds = 1, between_hands_seconds = 1, runout_street_seconds = 0, max_active_tables = 500`;
  }, LONG);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it(
    "buys in with promo credit, cash first, then bonus",
    async () => {
      const bonusOnly = await player(0, 5000);
      const a = await sit(bonusOnly, 2, 1000);
      expect(await seatStake(bonusOnly.id, a.table_id)).toEqual({ eligible: 0, bonus: 1000 });
      expect(await bal(bonusOnly.id)).toBe(4000);

      const mixed = await player(600, 5000);
      const b = await sit(mixed, 2, 1000);
      expect(await seatStake(mixed.id, b.table_id)).toEqual({ eligible: 600, bonus: 400 });
      await leave(bonusOnly, a.table_id);
      await leave(mixed, b.table_id);
      expect(await bucket(bonusOnly.id)).toEqual({ eligible: 0, bonus: 5000 });
      expect(await bucket(mixed.id)).toEqual({ eligible: 600, bonus: 5000 });
      await parity();
    },
    LONG,
  );

  it(
    "bonus dumped to a depositor stays bonus at cash-out",
    async () => {
      const promo = await player(0, 1000);
      const cash = await player(1000);
      const t = (await sit(promo, 2, 1000)).table_id as number;
      await sit(cash, null, 1000, t);
      const moves = new Map([
        [promo.id, foldToAnyBet],
        [cash.id, raiser],
      ]);
      for (let i = 0; i < 6; i++) await playHand(t, [promo, cash], moves);
      const lost = 1000 - (await seatStake(promo.id, t)).bonus;
      expect(lost).toBeGreaterThan(0);
      await leave(promo, t);
      await leave(cash, t);
      const won = await bucket(cash.id);
      // The depositor keeps exactly their own cash as eligible; the promo chips are bonus.
      expect(won.eligible).toBeLessThanOrEqual(1000);
      expect(won.bonus).toBeGreaterThan(0);
      expect(won.eligible + won.bonus).toBe(await bal(cash.id));
      const left = await bucket(promo.id);
      expect(left.eligible).toBe(0);
      expect(left.bonus).toBe(await bal(promo.id));
      await parity();
    },
    LONG,
  );

  it(
    "flop hands count toward promo playthrough; preflop folds do not",
    async () => {
      const adm = await admin();
      const created = (
        await sql`select pvp_test.promo_admin_create('POKERPT', 500::bigint, 10, null::timestamptz) r
          from (select set_config('test.uid', ${adm.id}, true), set_config('request.jwt.claims', ${adm.claims}, true)) c`
      )[0]!.r;
      expect(created.ok).toBe(true);
      const u = await player(2000);
      const claimed = (
        await sql`select pvp_test.promo_claim('POKERPT') r
          from (select set_config('test.uid', ${u.id}, true), set_config('test.client_ip', ${promoTestIp(u.id)}, true)) c`
      )[0]!.r;
      expect(claimed.ok, JSON.stringify(claimed)).toBe(true);
      const opp = await player(5000);
      const t = (await sit(u, 2, 1000)).table_id as number;
      await sit(opp, null, 1000, t);

      const preflop = await playHand(
        t,
        [u, opp],
        new Map([
          [u.id, foldToAnyBet],
          [opp.id, raiser],
        ]),
      );
      expect(preflop.board?.length ?? 0).toBe(0);
      const flop = await playHand(
        t,
        [u, opp],
        new Map([
          [u.id, passive],
          [opp.id, passive],
        ]),
      );
      expect(flop.board.length).toBeGreaterThanOrEqual(3);

      const wagers = await sql`select source_id, amount_cents from pvp_test.promo_wagers
        where user_id = ${u.id}::uuid and game = 'poker'`;
      const [hp] = await sql`select wagered from pvp_test.poker_hand_players
        where hand_id = ${flop.id} and user_id = ${u.id}::uuid`;
      expect(wagers.map((w) => [w.source_id, Number(w.amount_cents)])).toEqual([
        [`${flop.id}:${u.id}`, Number(hp!.wagered)],
      ]);
      const [c] =
        await sql`select qualifying_wager_cents from pvp_test.promo_claims where user_id = ${u.id}::uuid`;
      expect(Number(c!.qualifying_wager_cents)).toBe(Number(hp!.wagered));
      // Replaying the hook for the same hand counts nothing twice.
      await sql`select pvp_test.referral_note_play(${u.id}::uuid, 'poker', ${`${flop.id}:${u.id}`}, 1)`;
      const [c2] =
        await sql`select qualifying_wager_cents from pvp_test.promo_claims where user_id = ${u.id}::uuid`;
      expect(Number(c2!.qualifying_wager_cents)).toBe(Number(hp!.wagered));
      // Someone else's hand is not the claimant's wager.
      expect(
        Number(
          (
            await sql`select pvp_test._playthrough_stake(${u.id}::uuid, 'poker', ${`${flop.id}:${opp.id}`}) s`
          )[0]!.s ?? 0,
        ),
      ).toBe(0);
      await leave(u, t);
      await leave(opp, t);
      await parity();
    },
    LONG,
  );

  it(
    "buys in with partner credit and holds the partner's losses to a regular player",
    async () => {
      const adm = await admin();
      const partner = await player(0);
      await credit(partner.id, 5000, "partner_credit");
      await sql`insert into pvp_test.partners (user_id, created_by, leaderboard) values (${partner.id}::uuid, ${adm.id}::uuid, false)`;
      const friend = await player(1000);
      const t = (await sit(partner, 2, 1000)).table_id as number;
      expect(await seatStake(partner.id, t)).toEqual({ eligible: 0, bonus: 1000 });
      expect(await bal(partner.id)).toBe(4000);
      await sit(friend, null, 1000, t);
      const h = await playHand(
        t,
        [partner, friend],
        new Map([
          [partner.id, foldToAnyBet],
          [friend.id, raiser],
        ]),
      );
      const [hp] = await sql`select start_stack - end_stack lost from pvp_test.poker_hand_players
        where hand_id = ${h.id} and user_id = ${partner.id}::uuid`;
      expect(Number(hp!.lost)).toBeGreaterThan(0);
      const ev =
        await sql`select game, user_id, profit_cents, auto_cleared_cents + held_cents total, ledger_tx_id
        from pvp_test.partner_profit_events where partner_user_id = ${partner.id}::uuid`;
      expect(ev.map((e) => [e.game, e.user_id, Number(e.profit_cents), Number(e.total)])).toEqual([
        ["poker", friend.id, Number(hp!.lost), Number(hp!.lost)],
      ]);
      expect(ev[0]!.ledger_tx_id).toBe(h.ledger_tx_id);
      // Partner credit won by the friend stays bonus in the friend's seat.
      const won = await seatStake(friend.id, t);
      expect(won.bonus).toBeGreaterThan(0);
      expect(won.eligible).toBeLessThanOrEqual(1000);
      await leave(partner, t);
      await leave(friend, t);
      await parity();
    },
    LONG,
  );

  it(
    "a player whose browser went away sits out before the deal, without a void or a strike",
    async () => {
      const ghost = await player(2000);
      const fresh = await player(2000);
      const t = (await sit(ghost, 2, 1000)).table_id as number;
      const before = Number((await latest(t))?.id ?? 0);
      await sql`update pvp_test.poker_seats set last_seen_at = clock_timestamp() - interval '60 seconds'
        where table_id = ${t} and user_id = ${ghost.id}::uuid`;
      await sit(fresh, null, 1000, t);
      await nextHand(t);

      const seat = async () =>
        (
          await sql`select state, sat_out_reason from pvp_test.poker_seats
            where table_id = ${t} and user_id = ${ghost.id}::uuid and status <> 'CLOSED'`
        )[0] as Row;
      expect(await seat()).toMatchObject({ state: "SITTING_OUT", sat_out_reason: "away" });
      const hands =
        await sql`select status from pvp_test.poker_hands where table_id = ${t} and id > ${before}`;
      expect(hands.filter((h) => h.status === "VOIDED")).toHaveLength(0);
      const strikes = async () =>
        Number((await sql`select pvp_test._poker_void_strikes(${ghost.id}::uuid) n`)[0]!.n);
      expect(await strikes()).toBe(0);
      const me = async () =>
        (await as(ghost.id, (tx) => tx`select pvp_test.poker_table_state(${t}::bigint) r`))[0]!.r
          .me;
      expect((await me()).sat_out_reason).toBe("away");
      const mine = (await as(ghost.id, (tx) => tx`select pvp_test.poker_lobby() r`))[0]!.r.mine;
      expect(mine).toEqual([expect.objectContaining({ table_id: t, state: "SITTING_OUT" })]);

      // Coming back deals them in again and the hand plays out normally.
      await as(ghost.id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, false, null)`);
      expect(await seat()).toMatchObject({ state: "ACTIVE", sat_out_reason: null });
      const h = await playHand(
        t,
        [ghost, fresh],
        new Map([
          [ghost.id, passive],
          [fresh.id, passive],
        ]),
      );
      expect(h.status).toBe("COMPLETED");

      // A deliberate sit-out stays manual so the browser never deals the player back in.
      await as(ghost.id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, true, null)`);
      expect((await seat()).sat_out_reason).toBe("manual");
      await as(ghost.id, (tx) => tx`select pvp_test.poker_heartbeat(${t}::bigint)`);
      expect(await seat()).toMatchObject({ state: "SITTING_OUT", sat_out_reason: "manual" });
      // Heartbeats from someone without a seat are a no-op.
      const stranger = await player(0);
      await as(stranger.id, (tx) => tx`select pvp_test.poker_heartbeat(${t}::bigint)`);
      expect(await strikes()).toBe(0);

      await leave(ghost, t);
      await leave(fresh, t);
      await parity();
    },
    LONG,
  );

  it(
    "a player waiting alone can leave at any time and gets the whole buy-in back",
    async () => {
      const p = await player(3000);
      const t = (await sit(p, 2, 1000)).table_id as number;
      expect(await bal(p.id)).toBe(2000);
      // Waited a long time, then sat out, then gave up: each leave path returns everything.
      await sql`update pvp_test.poker_seats set created_at = clock_timestamp() - interval '2 hours'
        where table_id = ${t} and user_id = ${p.id}::uuid and status = 'SEATED'`;
      const r = (await leave(p, t))[0] as Row;
      expect(r).toBeDefined();
      expect(await bal(p.id)).toBe(3000);
      const [open] = await sql`select count(*)::int n from pvp_test.poker_seats
        where user_id = ${p.id}::uuid and status <> 'CLOSED'`;
      expect(open!.n).toBe(0);
      const [tbl] = await sql`select seated from pvp_test.poker_tables where id = ${t}`;
      expect(tbl!.seated).toBe(0);

      const again = (await sit(p, null, 1000, t)).table_id as number;
      expect(again).toBe(t);
      await as(p.id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, true, null)`);
      await leave(p, t);
      expect(await bal(p.id)).toBe(3000);
      // Leaving twice is harmless.
      await leave(p, t);
      expect(await bal(p.id)).toBe(3000);
      await parity();
    },
    LONG,
  );

  it(
    "leaving after revealing folds the hand instead of cancelling it, with no strike",
    async () => {
      const leaver = await player(3000);
      const stay = await player(3000);
      const t = (await sit(leaver, 2, 1000)).table_id as number;
      await sit(stay, null, 1000, t);
      let h = await latest(t);
      for (let i = 0; i < 5 && h?.status !== "COMMIT"; i++) {
        await nextHand(t);
        h = await latest(t);
      }
      expect(h!.status).toBe("COMMIT");
      const reveal = async (p: Player) => {
        const [r] = await sql`select link from pvp_test.poker_hand_players
          where hand_id = ${h!.id} and user_id = ${p.id}::uuid`;
        const next = p.links[p.links.indexOf(r!.link) + 1]!;
        await as(p.id, (tx) => tx`select pvp_test.poker_reveal(${h!.id}::bigint, ${next})`);
      };
      await reveal(leaver);
      const lr = (await leave(leaver, t))[0]!.r as Row;
      expect(lr.pending).toBe(true);
      expect((await latest(t))!.status).toBe("COMMIT");
      await reveal(stay);

      for (let i = 0; i < 50; i++) {
        const cur = (await latest(t))!;
        if (cur.id !== h!.id || !["BETTING", "COMMIT"].includes(cur.status)) break;
        const [hp] = await sql`select user_id from pvp_test.poker_hand_players
          where hand_id = ${cur.id} and seat_no = ${cur.to_act}`;
        if (hp!.user_id === leaver.id) {
          await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${t}`;
          await as(null, (tx) => tx`select pvp_test.poker_tick()`);
          continue;
        }
        const st = (
          await as(stay.id, (tx) => tx`select pvp_test.poker_table_state(${t}::bigint) r`)
        )[0]!.r;
        const [a] = passive(st.me.legal as Legal);
        await as(
          stay.id,
          (tx) =>
            tx`select pvp_test.poker_act(${cur.id}::bigint, ${st.hand.version}::int, ${a}, 0::bigint, ${randomUUID()})`,
        );
      }
      const [done] =
        await sql`select status, void_reason from pvp_test.poker_hands where id = ${h!.id}`;
      expect(done!.status).toBe("COMPLETED");
      const [lact] = await sql`select action from pvp_test.poker_actions
        where hand_id = ${h!.id} and user_id = ${leaver.id}::uuid order by seq desc limit 1`;
      expect(lact!.action).toBe("FOLD");
      const [hp] = await sql`select start_stack - end_stack lost from pvp_test.poker_hand_players
        where hand_id = ${h!.id} and user_id = ${leaver.id}::uuid`;
      const [closed] = await sql`select status, cashed_out from pvp_test.poker_seats
        where table_id = ${t} and user_id = ${leaver.id}::uuid order by id desc limit 1`;
      expect(closed!.status).toBe("CLOSED");
      // The blind in the pot is forfeited; the rest of the stack comes back.
      expect(Number(closed!.cashed_out)).toBe(1000 - Number(hp!.lost));
      expect(await bal(leaver.id)).toBe(3000 - Number(hp!.lost));
      expect(
        Number((await sql`select pvp_test._poker_void_strikes(${leaver.id}::uuid) n`)[0]!.n),
      ).toBe(0);
      await leave(stay, t);
      await parity();
    },
    LONG,
  );

  it(
    "a lone player who closed the browser is sat out, then cashed out by the kick",
    async () => {
      const p = await player(3000);
      const t = (await sit(p, 2, 1000)).table_id as number;
      const seat = async () =>
        (
          await sql`select state, status, sat_out_reason from pvp_test.poker_seats
            where table_id = ${t} and user_id = ${p.id}::uuid order by id desc limit 1`
        )[0] as Row;
      // A live heartbeat keeps a waiting player seated.
      await as(null, (tx) => tx`select pvp_test.poker_tick()`);
      expect(await seat()).toMatchObject({ state: "ACTIVE", status: "SEATED" });

      await sql`update pvp_test.poker_seats set last_seen_at = clock_timestamp() - interval '2 minutes'
        where table_id = ${t} and user_id = ${p.id}::uuid and status = 'SEATED'`;
      await as(null, (tx) => tx`select pvp_test.poker_tick()`);
      expect(await seat()).toMatchObject({
        state: "SITTING_OUT",
        status: "SEATED",
        sat_out_reason: "away",
      });
      const [due] =
        await sql`select next_due_at is not null d from pvp_test.poker_tables where id = ${t}`;
      expect(due!.d).toBe(true);
      expect(await bal(p.id)).toBe(2000);

      await sql`update pvp_test.poker_seats set sat_out_at = clock_timestamp() - interval '1 hour'
        where table_id = ${t} and user_id = ${p.id}::uuid and status = 'SEATED'`;
      await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${t}`;
      await as(null, (tx) => tx`select pvp_test.poker_tick()`);
      expect((await seat()).status).toBe("CLOSED");
      expect(await bal(p.id)).toBe(3000);
      await parity();
    },
    LONG,
  );
});
