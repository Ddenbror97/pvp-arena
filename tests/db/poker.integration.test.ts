/**
 * Poker v1: cash-then-bonus buy-ins, every stake tier, complete hands through the player RPCs,
 * SQL/TypeScript rule and fairness parity, idempotency, concurrency, timeouts, voids,
 * settlement retry, access control, hooks and ledger reconciliation.
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 *
 * Tests read poker_hole_cards and poker_hand_decks directly (they connect as the schema
 * owner) to replay every hand independently with the TypeScript engine and verifier.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { creditUserDeposit, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";
import { evaluate } from "../../src/lib/poker/evaluator";
import {
  act as engineAct,
  settleHand,
  startHand,
  type ActionType,
} from "../../src/lib/poker/engine";
import { buildChain, pokerShuffle, verifyPokerHand } from "../../src/lib/fairness/poker";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 10, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
const LONG = 240_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows and jsonb come back untyped
type Row = Record<string, any>;
type Player = { id: string; links: string[] };
type Legal = {
  to_call: number;
  can_check: boolean;
  can_call: boolean;
  call_amount: number;
  can_raise: boolean;
  min_raise_to: number;
  max_raise_to: number;
};
type Strategy = (la: Legal, h: Row) => [string, number?];

const TIERS = [
  [1, "$5", "Micro", 2, 5, 200, 500],
  [2, "$10", "Micro", 5, 10, 400, 1000],
  [3, "$25", "Low", 10, 25, 1000, 2500],
  [4, "$50", "Low", 25, 50, 2000, 5000],
  [5, "$100", "Mid", 50, 100, 4000, 10000],
  [6, "$250", "Mid", 100, 200, 10000, 25000],
  [7, "$500", "High", 200, 500, 20000, 50000],
  [8, "$1,000", "VIP", 500, 1000, 40000, 100000],
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const credited = new Map<string, number>();
const everyone: Player[] = [];

async function as<T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
  fail = false,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (fail) await tx`select set_config('pvp.fail_settlement', 'on', true)`;
    return fn(tx);
  }) as Promise<T>;
}
async function asRole<T>(
  role: "anon" | "authenticated",
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    await tx.unsafe(`set local role ${role}`);
    return fn(tx);
  }) as Promise<T>;
}
const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "";
  } catch (e) {
    return String((e as Error).message);
  }
};

let userN = 0;
async function player(deposit: number, bonus = 0): Promise<Player> {
  const id = randomUUID();
  await as(
    id,
    (tx) =>
      tx`select pvp_test.ensure_profile(${`pk${++userN}${id.slice(0, 8)}`.slice(0, 20)}, true)`,
  );
  for (const kind of ["user_available", "user_locked"])
    await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
      select ${id}::uuid, ${kind}::pvp_test.account_kind, 'USD', 'real'
      where not exists (select 1 from pvp_test.wallet_accounts
        where owner_id = ${id}::uuid and kind = ${kind}::pvp_test.account_kind and asset = 'USD' and account_type = 'real')`;
  if (deposit) await sql.begin((tx) => creditUserDeposit(tx, id, deposit));
  if (bonus) await creditBonus(id, bonus);
  credited.set(id, deposit + bonus);
  const p = { id, links: await buildChain(randomBytes(32).toString("hex"), 80) };
  everyone.push(p);
  return p;
}
async function creditBonus(uid: string, cents: number) {
  const house = (await sql`select pvp_test._system_account('house_bankroll', 'USD', 'real') id`)[0]
    .id;
  const avail = (
    await sql`select pvp_test._user_account(${uid}::uuid, 'user_available', 'USD', 'real') id`
  )[0].id;
  await sql.begin(async (tx) => {
    const t = (
      await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
      values ('promo_reward', ${randomUUID()}, 'real', ${uid}::uuid) returning id`
    )[0].id;
    await tx`select pvp_test._post(${t}::uuid, ${house}::uuid, ${-cents}::bigint)`;
    await tx`select pvp_test._post(${t}::uuid, ${avail}::uuid, ${cents}::bigint)`;
  });
}
const bal = async (uid: string, kind = "user_available") =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid}::uuid and kind = ${kind}
    and asset = 'USD' and account_type = 'real'`
    )[0]?.balance ?? 0,
  );
const houseRevenue = async () =>
  Number(
    (
      await sql`select coalesce(sum(balance), 0) b from pvp_test.wallet_accounts
    where owner_id is null and kind = 'house_revenue' and asset = 'USD' and account_type = 'real'`
    )[0].b,
  );

const sit = (
  p: Player,
  type: number | null,
  buyIn: number,
  o: { table?: number; seat?: number; key?: string; head?: string } = {},
) =>
  as(
    p.id,
    (
      tx,
    ) => tx`select pvp_test.poker_sit(${o.table ?? null}::bigint, ${type}::smallint, ${o.seat ?? null}::smallint,
    ${buyIn}::bigint, ${o.head ?? p.links[0]!}, ${o.key ?? randomUUID()}) r`,
  ).then((r) => r[0]!.r as Row);
const leave = (p: Player, table: number) =>
  as(p.id, (tx) => tx`select pvp_test.poker_leave(${table}::bigint) r`).then((r) => r[0]!.r as Row);
const tick = () => as(null, (tx) => tx`select pvp_test.poker_tick() r`).then((r) => r[0]!.r as Row);
const tableState = (p: Player | null, table: number) =>
  as(p?.id ?? null, (tx) => tx`select pvp_test.poker_table_state(${table}::bigint) r`).then(
    (r) => r[0]!.r as Row,
  );
const latestHand = async (table: number) =>
  (
    await sql`select * from pvp_test.poker_hands where table_id = ${table} order by id desc limit 1`
  )[0] as Row | undefined;
const reconcile = async () => (await sql`select pvp_test.poker_reconcile() r`)[0]!.r as Row;
const actRpc = (
  p: Player,
  hand: string | number,
  version: number,
  action: string,
  amount = 0,
  key = randomUUID(),
  fail = false,
) =>
  as(
    p.id,
    (tx) =>
      tx`select pvp_test.poker_act(${hand}::bigint, ${version}::int, ${action}, ${amount}::bigint, ${key}) r`,
    fail,
  ).then((r) => r[0]!.r as Row);

/** Reveals the next preimage for every participant that has not revealed. */
async function revealAll(hand: string | number, players: Player[], skip: string[] = []) {
  const rows =
    await sql`select user_id, link from pvp_test.poker_hand_players where hand_id = ${hand}::bigint and reveal is null`;
  for (const r of rows) {
    if (skip.includes(r.user_id)) continue;
    const p = players.find((x) => x.id === r.user_id)!;
    const i = p.links.indexOf(r.link);
    expect(i).toBeGreaterThanOrEqual(0);
    await as(p.id, (tx) => tx`select pvp_test.poker_reveal(${hand}::bigint, ${p.links[i + 1]!}) r`);
  }
}

const passive: Strategy = (la) => (la.can_check ? ["CHECK"] : ["CALL"]);

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 2 ** 32;
  };
}
function randomStrategy(seed: number): Strategy {
  const r = rng(seed);
  return (la) => {
    const x = r();
    if (x < 0.12 && !la.can_check) return ["FOLD"];
    if (la.can_raise && x > 0.9) return ["ALL_IN"];
    if (la.can_raise && x > 0.65) {
      const to =
        la.min_raise_to + Math.floor(r() * Math.max(1, (la.max_raise_to - la.min_raise_to) / 3));
      return [
        la.to_call === 0 && la.min_raise_to > 0 && !la.can_call ? "BET" : "RAISE",
        Math.min(to, la.max_raise_to),
      ];
    }
    return la.can_check ? ["CHECK"] : ["CALL"];
  };
}

/** Plays the table's current hand to a terminal state through the player RPCs. */
async function drive(table: number, players: Player[], strategy: Strategy = passive) {
  for (let i = 0; i < 300; i++) {
    const h = await latestHand(table);
    if (!h) throw new Error("NO_HAND");
    if (h.status === "COMMIT") {
      await revealAll(h.id, players);
      continue;
    }
    if (h.status !== "BETTING") return h;
    const hp = (
      await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id} and seat_no = ${h.to_act}`
    )[0]!;
    const p = players.find((x) => x.id === hp.user_id)!;
    const st = await tableState(p, table);
    expect(st.me.legal).toBeTruthy();
    const [chosen, amt] = strategy(st.me.legal as Legal, h);
    let a = chosen;
    if (a === "BET" && Number(h.current_bet) > 0) a = "RAISE";
    if (a === "RAISE" && Number(h.current_bet) === 0) a = "BET";
    await actRpc(p, h.id, st.hand.version, a, amt ?? 0);
  }
  throw new Error("HAND_DID_NOT_FINISH");
}

/** The hand in progress, waiting out a between-hands pause left by an earlier hand on this table. */
async function liveHand(table: number) {
  for (let i = 0; i < 5; i++) {
    const h = await latestHand(table);
    if (h && ["COMMIT", "BETTING"].includes(h.status)) return h;
    await nextHand(table);
  }
  throw new Error("NO_LIVE_HAND");
}

/** Waits out the between-hands pause and lets the worker open the next hand. */
async function nextHand(table: number) {
  const last = await latestHand(table);
  if (last?.next_hand_at) {
    const ms = +new Date(last.next_hand_at) - Date.now() + 60;
    if (ms > 0) await sleep(ms);
  }
  await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table} and next_due_at is not null`;
  await tick();
  const h = await latestHand(table);
  return h && h.id !== last?.id ? h : null;
}

/** Independent replay of a finished hand: fairness proof, deal positions, rules and settlement. */
async function replay(handId: string | number) {
  const dt = (await sql`select pvp_test.poker_hand_detail(${handId}::bigint) r`)[0]!.r as Row;
  expect(dt.status).toBe("COMPLETED");
  const ps = dt.players as Row[];
  const proof = await verifyPokerHand({
    id: dt.id,
    server_seed: dt.server_seed,
    server_seed_hash: dt.server_seed_hash,
    entropy: dt.entropy,
    reveals: ps.map((p) => ({ seat: p.seat_no, value: p.reveal })),
    links: Object.fromEntries(ps.map((p) => [p.seat_no, p.link])),
  });
  expect(proof.hashOk && proof.revealsOk && proof.entropyOk).toBe(true);
  const stored = (
    await sql`select deck from pvp_test.poker_hand_decks where hand_id = ${handId}::bigint`
  )[0]!.deck as number[];
  expect(proof.deck).toEqual(stored);
  const holes =
    await sql`select seat_no, cards from pvp_test.poker_hole_cards where hand_id = ${handId}::bigint`;
  const n = ps.length;
  for (const p of ps) {
    const hc = holes.find((x) => x.seat_no === p.seat_no)!.cards as number[];
    expect(hc).toEqual([stored[p.deal_index], stored[p.deal_index + n]]);
  }
  const board = dt.board as number[];
  const want = [
    stored[2 * n + 1],
    stored[2 * n + 2],
    stored[2 * n + 3],
    stored[2 * n + 5],
    stored[2 * n + 7],
  ];
  expect(board).toEqual(want.slice(0, board.length));

  let s = startHand({
    seats: ps.map((p) => ({
      seat: p.seat_no,
      stack: Number(p.start_stack),
      postsBigBlind: p.posts_bb,
    })),
    button: dt.button_seat,
    sb: Number(dt.small_blind),
    bb: Number(dt.big_blind),
    maxSeats: 6,
  });
  expect([s.sbSeat, s.bbSeat]).toEqual([dt.sb_seat, dt.bb_seat]);
  for (const a of dt.actions as Row[]) {
    const t = String(a.action).replace("TIMEOUT_", "");
    if (!["FOLD", "CHECK", "CALL", "BET", "RAISE"].includes(t)) continue;
    s = engineAct(s, a.seat_no, t as ActionType, Number(a.to_amount ?? 0));
  }
  expect(s.ended).toBe(true);
  const holeCards = Object.fromEntries(holes.map((h) => [h.seat_no, h.cards as number[]]));
  const st = settleHand(s, { feeBps: dt.fee_bps, holeCards, board });
  expect(st.feeTotal).toBe(Number(dt.fee_total));
  for (const p of ps) {
    expect(st.payouts[p.seat_no] ?? 0).toBe(Number(p.won) + Number(p.refund));
    expect(Number(p.end_stack)).toBe(
      s.players.find((x) => x.seat === p.seat_no)!.stack + (st.payouts[p.seat_no] ?? 0),
    );
  }
  return { dt, st };
}

d("poker", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    for (const k of ["game_escrow", "house_revenue", "house_bankroll"])
      await sql`select pvp_test._system_account(${k}::pvp_test.account_kind, 'USD', 'real')`;
    await sql`update pvp_test.wallet_accounts set balance = 100000000
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
    await sql`update pvp_test.poker_config set enabled = true, reveal_seconds = 2, action_seconds = 5,
      showdown_seconds = 1, between_hands_seconds = 1, runout_street_seconds = 0, max_active_tables = 500`;
    await sql`grant usage on schema pvp_test to anon, authenticated`;
    await sql`grant execute on function pvp_test.test_uid() to anon, authenticated`;
  }, LONG);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("SQL evaluator matches the TypeScript evaluator on random 5-7 card hands", async () => {
    const r = rng(7);
    const hands: number[][] = [];
    for (let i = 0; i < 3000; i++) {
      const deck = Array.from({ length: 52 }, (_, k) => k);
      for (let k = 51; k > 0; k--) {
        const j = Math.floor(r() * (k + 1));
        [deck[k], deck[j]] = [deck[j]!, deck[k]!];
      }
      hands.push(deck.slice(0, 5 + (i % 3)));
    }
    const rows =
      await sql`select (x.ord - 1)::int i, pvp_test._poker_eval(array(select jsonb_array_elements_text(x.v)::smallint)) s
      from jsonb_array_elements(${JSON.stringify(hands)}::text::jsonb) with ordinality x(v, ord)`;
    for (const row of rows) expect(row.s).toBe(evaluate(hands[row.i]!));
  });

  it("SQL shuffle matches the TypeScript shuffle", async () => {
    for (let i = 0; i < 12; i++) {
      const seed = randomBytes(32).toString("hex");
      const entropy = randomBytes(32).toString("hex");
      const hand = 2000000000000001 + i * 7919;
      const deck = (
        await sql`select pvp_test._poker_shuffle(decode(${seed}, 'hex'), ${hand}::bigint, ${entropy}) d`
      )[0]!.d;
      expect(deck).toEqual((await pokerShuffle(seed, hand, entropy)).deck);
    }
  });

  it("seeds the eight approved stake tiers in integer cents", async () => {
    const rows =
      await sql`select id, label, category, small_blind, big_blind, min_buy_in, max_buy_in, max_seats, enabled
      from pvp_test.poker_table_types order by id`;
    expect(
      rows.map((r) => [
        r.id,
        r.label,
        r.category,
        +r.small_blind,
        +r.big_blind,
        +r.min_buy_in,
        +r.max_buy_in,
      ]),
    ).toEqual(TIERS.map((t) => [...t]));
    for (const r of rows) {
      expect(r.max_seats).toBe(6);
      expect(+r.min_buy_in).toBeGreaterThanOrEqual(20 * +r.big_blind);
      expect(+r.max_buy_in).toBeLessThanOrEqual(250 * +r.big_blind);
      expect(Number(r.label.replace(/[$,]/g, "")) * 100).toBe(+r.max_buy_in);
    }
  });

  it(
    "validates buy-ins at every tier and returns the exact stack on leave",
    async () => {
      const p = await player(250_000);
      for (const [type, , , , , min, max] of TIERS) {
        expect(await err(sit(p, type, min - 1))).toContain("INVALID_BUY_IN");
        expect(await err(sit(p, type, max + 1))).toContain("INVALID_BUY_IN");
        const before = await bal(p.id);
        const r = await sit(p, type, max);
        expect(await bal(p.id)).toBe(before - max);
        expect(await bal(p.id, "user_locked")).toBe(max);
        const t = (await sql`select * from pvp_test.poker_tables where id = ${r.table_id}`)[0]!;
        expect([+t.small_blind, +t.big_blind, t.fee_bps]).toEqual([
          TIERS[type - 1]![3],
          TIERS[type - 1]![4],
          500,
        ]);
        await leave(p, r.table_id);
        expect(await bal(p.id)).toBe(before);
        expect(await bal(p.id, "user_locked")).toBe(0);
      }
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "takes eligible cash first, then bonus, like the other games",
    async () => {
      const bonusOnly = await player(0, 5000);
      const b = await sit(bonusOnly, 2, 400);
      expect(await bal(bonusOnly.id)).toBe(4600);
      await leave(bonusOnly, b.table_id);
      expect(await bal(bonusOnly.id)).toBe(5000);

      const mixed = await player(1000, 5000);
      // The lobby reads the cached basis; the worker keeps it current.
      await sql`select pvp_test._withdraw_basis_sync()`;
      const info = (
        await as(mixed.id, (tx) => tx`select pvp_test.poker_buyin_info(2::smallint) r`)
      )[0]!.r;
      expect(info.cash).toBe(1000);
      expect(info.available).toBe(6000);
      const r = await sit(mixed, 2, 1000);
      const stake = (
        await sql`select s.eligible, s.bonus from pvp_test.withdraw_basis_ledger_stake s
      join pvp_test.ledger_transactions t on t.id = s.ledger_tx_id
      where t.kind = 'poker_entry' and t.user_id = ${mixed.id}::uuid`
      )[0]!;
      expect([+stake.eligible, +stake.bonus]).toEqual([1000, 0]);
      // Eligible cash is used up, so a second table is bought with bonus. It needs its own chain.
      const second = (await buildChain(randomBytes(32).toString("hex"), 2))[0]!;
      const r2 = await sit(mixed, 1, 200, { head: second });
      const stake2 = (
        await sql`select s.eligible, s.bonus from pvp_test.withdraw_basis_ledger_stake s
      join pvp_test.ledger_transactions t on t.id = s.ledger_tx_id
      where t.kind = 'poker_entry' and t.user_id = ${mixed.id}::uuid and t.game_id = (
        select id from pvp_test.poker_seats where user_id = ${mixed.id}::uuid and table_id = ${r2.table_id})`
      )[0]!;
      expect([+stake2.eligible, +stake2.bonus]).toEqual([0, 200]);
      await leave(mixed, r.table_id);
      await leave(mixed, r2.table_id);
      await sql`select pvp_test._withdraw_basis_sync()`;
      const peek = (await sql`select pvp_test._withdraw_basis_peek(${mixed.id}::uuid) r`)[0]!.r;
      expect([+peek.eligible, +peek.bonus]).toEqual([1000, 5000]);
      expect(await bal(mixed.id)).toBe(6000);

      const broke = await player(100);
      expect(await err(sit(broke, 1, 200))).toContain("INSUFFICIENT_BALANCE");
    },
    LONG,
  );

  it(
    "plays complete heads-up hands that verify, replay and reconcile",
    async () => {
      const a = await player(10_000);
      const b = await player(10_000);
      const ra = await sit(a, 2, 1000);
      const rb = await sit(b, null, 1000, { table: ra.table_id });
      expect(rb.table_id).toBe(ra.table_id);
      const table = ra.table_id as number;
      let h = await liveHand(table);
      expect(h.status).toBe("COMMIT");
      expect(h.server_seed).toBeNull();
      // Commitment published, deck not yet derivable.
      expect(
        (
          await sql`select count(*)::int n from pvp_test.poker_hand_decks where hand_id = ${h.id}`
        )[0]!.n,
      ).toBe(0);
      await revealAll(h.id, [a, b]);
      h = (await latestHand(table))!;
      expect(h.status).toBe("BETTING");
      // Heads-up: the button posts the small blind and acts first preflop.
      expect(h.sb_seat).toBe(h.button_seat);
      expect(h.to_act).toBe(h.button_seat);
      const sa = await tableState(a, table);
      expect(sa.me.hole_cards).toHaveLength(2);
      expect((sa.hand.players as Row[]).every((p) => p.shown_cards === null)).toBe(true);
      const anon = await tableState(null, table);
      expect(anon.me).toBeNull();
      expect(anon.hand.server_seed).toBeNull();

      const before = (await houseRevenue()) as number;
      const done = await drive(table, [a, b]);
      expect(done.status).toBe("COMPLETED");
      const { dt } = await replay(done.id);
      expect(dt.board).toHaveLength(5);
      expect(Number(dt.fee_total)).toBe(Math.floor((20 * 500) / 10000));
      expect((await houseRevenue()) - before).toBe(Number(dt.fee_total));
      expect((await reconcile()).ok).toBe(true);

      for (let i = 0; i < 3; i++) {
        const nh = await nextHand(table);
        expect(nh).toBeTruthy();
        const fin = await drive(table, [a, b], randomStrategy(100 + i));
        expect(fin.status).toBe("COMPLETED");
        await replay(fin.id);
        expect((await reconcile()).ok).toBe(true);
      }
      const buttons = (
        await sql`select button_seat from pvp_test.poker_hands where table_id = ${table} order by id`
      ).map((r) => r.button_seat);
      for (let i = 1; i < buttons.length; i++) expect(buttons[i]).not.toBe(buttons[i - 1]);

      await leave(a, table);
      await leave(b, table);
      await drainTable(table, [a, b]);
      expect(await bal(a.id, "user_locked")).toBe(0);
      expect(await bal(b.id, "user_locked")).toBe(0);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "handles three-handed side pots, all-ins, busts and live big blinds",
    async () => {
      const ps = [await player(10_000), await player(10_000), await player(10_000)];
      const r0 = await sit(ps[0]!, 3, 1000);
      const table = r0.table_id as number;
      await sit(ps[1]!, null, 1700, { table });
      await sit(ps[2]!, null, 2500, { table });
      const owes = (
        await sql`select owes_bb from pvp_test.poker_seats where user_id = ${ps[2]!.id}::uuid and status = 'SEATED'`
      )[0]!;
      expect(owes.owes_bb).toBe(true);
      // Hand 1 is heads-up; the third player waits for the next hand.
      const first = await liveHand(table);
      expect(
        (
          await sql`select count(*)::int n from pvp_test.poker_hand_players where hand_id = ${first.id}`
        )[0]!.n,
      ).toBe(2);
      expect((await drive(table, ps)).status).toBe("COMPLETED");
      await replay(first.id);

      // Hand 2: everyone shoves with different stacks, so there must be a side pot.
      const second = (await nextHand(table))!;
      const shove: Strategy = (la) =>
        la.can_raise ? ["ALL_IN"] : la.can_check ? ["CHECK"] : ["CALL"];
      expect((await drive(table, ps, shove)).status).toBe("COMPLETED");
      const { dt } = await replay(second.id);
      const joined = (dt.players as Row[]).find((p) => p.user_id === ps[2]!.id)!;
      expect(joined).toBeTruthy();
      expect(joined.posts_bb || dt.bb_seat === joined.seat_no).toBe(true);
      const stacks = new Set((dt.players as Row[]).map((p) => Number(p.start_stack)));
      if (stacks.size === 3) expect((dt.pots as Row[]).length).toBeGreaterThanOrEqual(2);
      expect((await reconcile()).ok).toBe(true);

      let hands = 2;
      for (let i = 0; i < 10; i++) {
        const withChips = (
          await sql`select count(*)::int n from pvp_test.poker_seats
        where table_id = ${table} and status = 'SEATED' and stack + pending > 0`
        )[0]!.n;
        const nh = await nextHand(table);
        expect(Boolean(nh)).toBe(withChips >= 2);
        if (!nh) break;
        const fin = await drive(table, ps, randomStrategy(900 + i));
        if (fin.status === "COMPLETED") {
          await replay(fin.id);
          hands++;
        }
        expect((await reconcile()).ok).toBe(true);
      }
      expect(hands).toBeGreaterThanOrEqual(2);
      const busted =
        await sql`select count(*)::int n from pvp_test.poker_seats where table_id = ${table} and status = 'SEATED'
      and stack + pending = 0 and state <> 'SITTING_OUT'`;
      expect(busted[0]!.n).toBe(0);
      for (const p of ps) await leave(p, table);
      await drainTable(table, ps);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "voids a hand when a reveal is missing and moves no money",
    async () => {
      const a = await player(10_000);
      const b = await player(10_000);
      const r = await sit(a, 4, 2000);
      const table = r.table_id as number;
      await sit(b, null, 2000, { table });
      const h = await liveHand(table);
      await revealAll(h.id, [a, b], [b.id]);
      const ledger = (await sql`select count(*)::int n from pvp_test.ledger_transactions`)[0]!.n;
      await sql`update pvp_test.poker_hands set reveal_deadline = clock_timestamp() - interval '1 second' where id = ${h.id}`;
      await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
      await tick();
      const v = (await sql`select * from pvp_test.poker_hands where id = ${h.id}`)[0]!;
      expect(v.status).toBe("VOIDED");
      expect(v.void_reason).toBe("missing_reveal");
      expect(v.server_seed).toMatch(/^[0-9a-f]{64}$/);
      const seat = (
        await sql`select state from pvp_test.poker_seats where user_id = ${b.id}::uuid and status = 'SEATED'`
      )[0]!;
      expect(seat.state).toBe("SITTING_OUT");
      expect((await sql`select count(*)::int n from pvp_test.ledger_transactions`)[0]!.n).toBe(
        ledger,
      );
      expect(
        (
          await sql`select count(*)::int n from pvp_test.poker_hole_cards where hand_id = ${h.id}`
        )[0]!.n,
      ).toBe(0);
      // Back from sitting out with the same chain: the next preimage continues it.
      await as(b.id, (tx) => tx`select pvp_test.poker_sit_out(${table}::bigint, false, null)`);
      const h2 = await nextHand(table);
      expect(h2?.status).toBe("COMMIT");
      expect((await drive(table, [a, b])).status).toBe("COMPLETED");
      await leave(a, table);
      await leave(b, table);
      await drainTable(table, [a, b]);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "cashes out repeat withholders and blocks players who keep voiding hands",
    async () => {
      const a = await player(10_000);
      const w = await player(10_000);
      const r = await sit(a, 4, 2000);
      const table = r.table_id as number;
      await sit(w, null, 2000, { table });
      const withhold = async () => {
        const h = await liveHand(table);
        expect(h.status).toBe("COMMIT");
        await revealAll(h.id, [a, w], [w.id]);
        await sql`update pvp_test.poker_hands set reveal_deadline = clock_timestamp() - interval '1 second' where id = ${h.id}`;
        await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
        await tick();
        const v = (
          await sql`select status, voided_by from pvp_test.poker_hands where id = ${h.id}`
        )[0]!;
        expect(v.status).toBe("VOIDED");
        expect(v.voided_by).toEqual([w.id]);
      };

      await withhold();
      const seat = async () =>
        (
          await sql`select status, state, missed_reveals from pvp_test.poker_seats
          where user_id = ${w.id}::uuid and table_id = ${table} order by id desc limit 1`
        )[0]!;
      expect(await seat()).toMatchObject({
        status: "SEATED",
        state: "SITTING_OUT",
        missed_reveals: 1,
      });
      await as(w.id, (tx) => tx`select pvp_test.poker_sit_out(${table}::bigint, false, null)`);

      await withhold();
      expect((await seat()).status).toBe("CLOSED");
      expect(await bal(w.id)).toBe(10_000);
      expect(await bal(w.id, "user_locked")).toBe(0);

      // A third void, by leaving during the reveal window, reaches the daily limit.
      await sit(w, null, 2000, { table, head: w.links[40]! });
      const h3 = await liveHand(table);
      expect(h3.status).toBe("COMMIT");
      await leave(w, table);
      const v3 = (
        await sql`select void_reason, voided_by from pvp_test.poker_hands where id = ${h3.id}`
      )[0]!;
      expect(v3).toEqual({ void_reason: "player_left", voided_by: [w.id] });
      expect(await err(sit(w, 4, 2000, { head: w.links[60]! }))).toContain("VOID_COOLDOWN");
      expect(await bal(w.id)).toBe(10_000);

      await leave(a, table);
      await drainTable(table, [a, w]);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "times out to check or fold, sits out repeat offenders, and folds a leaving player",
    async () => {
      const a = await player(10_000);
      const b = await player(10_000);
      const r = await sit(a, 4, 2000);
      const table = r.table_id as number;
      await sit(b, null, 2000, { table });
      let h = await liveHand(table);
      await revealAll(h.id, [a, b]);
      h = (await latestHand(table))!;
      const toAct = h.to_act;
      await sql`update pvp_test.poker_hands set action_deadline = clock_timestamp() - interval '1 second' where id = ${h.id}`;
      await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
      await tick();
      const acts =
        await sql`select action from pvp_test.poker_actions where hand_id = ${h.id} and seat_no = ${toAct} order by seq`;
      // Facing the big blind preflop: a timeout folds.
      expect(acts.at(-1)!.action).toBe("TIMEOUT_FOLD");
      const done = (await sql`select * from pvp_test.poker_hands where id = ${h.id}`)[0]!;
      expect(done.status).toBe("COMPLETED");
      expect(Number(done.fee_total)).toBe(0);
      await replay(done.id);

      const h2 = (await nextHand(table))!;
      await revealAll(h2.id, [a, b]);
      // The leaver is not to act; the fold happens when the turn reaches them.
      const cur = (await latestHand(table))!;
      const other = (
        await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${cur.id} and seat_no <> ${cur.to_act}`
      )[0]!;
      const leaver = other.user_id === a.id ? a : b;
      const stay = leaver === a ? b : a;
      const lr = await leave(leaver, table);
      expect(lr.pending).toBe(true);
      const st = await tableState(stay, table);
      await actRpc(stay, cur.id, st.hand.version, "CALL");
      await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
      await tick();
      const fin = (await sql`select * from pvp_test.poker_hands where id = ${cur.id}`)[0]!;
      expect(fin.status).toBe("COMPLETED");
      const lact =
        await sql`select action from pvp_test.poker_actions where hand_id = ${cur.id} and user_id = ${leaver.id}::uuid order by seq`;
      expect(lact.at(-1)!.action).toBe("FOLD");
      const closed = (
        await sql`select status, cashed_out from pvp_test.poker_seats where user_id = ${leaver.id}::uuid order by id desc limit 1`
      )[0]!;
      expect(closed.status).toBe("CLOSED");
      expect(await bal(leaver.id, "user_locked")).toBe(0);
      expect(await bal(leaver.id)).toBe(10_000 - 2000 + Number(closed.cashed_out));
      await leave(stay, table);
      await drainTable(table, [a, b]);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "is idempotent for sits and actions and rejects stale versions",
    async () => {
      const a = await player(20_000);
      const b = await player(20_000);
      const key = randomUUID();
      const r1 = await sit(a, 5, 4000, { key });
      const r2 = await sit(a, 5, 4000, { key });
      expect(r2.duplicate).toBe(true);
      expect(await bal(a.id)).toBe(16_000);
      const table = r1.table_id as number;
      await sit(b, null, 4000, { table });
      let h = await liveHand(table);
      await revealAll(h.id, [a, b]);
      await revealAll(h.id, [a, b]);
      const p = (
        await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id} and reveal is not null`
      ).length;
      expect(p).toBe(2);
      h = (await latestHand(table))!;
      const actor =
        (
          await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id} and seat_no = ${h.to_act}`
        )[0]!.user_id === a.id
          ? a
          : b;
      const other = actor === a ? b : a;
      expect(await err(actRpc(other, h.id, h.version, "CALL"))).toContain("NOT_YOUR_TURN");
      expect(await err(actRpc(actor, h.id, h.version - 1, "CALL"))).toContain("STALE_STATE");
      expect(await err(actRpc(actor, h.id, h.version, "RAISE", 120))).toContain("BELOW_MIN_RAISE");
      expect(await err(actRpc(actor, h.id, h.version, "CHECK"))).toContain("CANNOT_CHECK");
      const akey = randomUUID();
      const [x, y] = await Promise.all([
        actRpc(actor, h.id, h.version, "CALL", 0, akey),
        actRpc(actor, h.id, h.version, "CALL", 0, akey),
      ]);
      expect([x.duplicate, y.duplicate].sort()).toEqual([false, true]);
      expect(
        (
          await sql`select count(*)::int n from pvp_test.poker_actions where hand_id = ${h.id} and idempotency_key = ${akey}`
        )[0]!.n,
      ).toBe(1);
      expect((await drive(table, [a, b])).status).toBe("COMPLETED");
      await leave(a, table);
      await leave(b, table);
      await drainTable(table, [a, b]);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "recovers from a failed settlement exactly once",
    async () => {
      const a = await player(20_000);
      const b = await player(20_000);
      const r = await sit(a, 5, 4000);
      const table = r.table_id as number;
      await sit(b, null, 4000, { table });
      let h = await liveHand(table);
      await revealAll(h.id, [a, b]);
      h = (await latestHand(table))!;
      const actor =
        (
          await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id} and seat_no = ${h.to_act}`
        )[0]!.user_id === a.id
          ? a
          : b;
      await actRpc(actor, h.id, h.version, "FOLD", 0, randomUUID(), true);
      let s = (await sql`select * from pvp_test.poker_hands where id = ${h.id}`)[0]!;
      expect(s.status).toBe("SETTLEMENT");
      expect(s.settle_attempts).toBe(1);
      expect(s.server_seed).toBeNull();
      expect(await bal(actor.id, "user_locked")).toBe(4000);
      await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
      await tick();
      s = (await sql`select * from pvp_test.poker_hands where id = ${h.id}`)[0]!;
      expect(s.status).toBe("COMPLETED");
      await sql`select pvp_test._poker_settle(${h.id}::bigint)`;
      expect(
        await err(sql`update pvp_test.poker_hands set fee_total = 0 where id = ${h.id}`),
      ).toContain("IMMUTABLE_RECORD");
      const txs =
        await sql`select count(*)::int n from pvp_test.ledger_transactions where idempotency_key = ${`poker:hand:${h.id}:settle`}`;
      expect(txs[0]!.n).toBe(1);
      await replay(h.id);
      await leave(a, table);
      await leave(b, table);
      await drainTable(table, [a, b]);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "serializes concurrent sits on one seat and caps tables per player",
    async () => {
      const a = await player(100_000);
      const b = await player(100_000);
      const c = await player(100_000);
      const r = await sit(a, 6, 10_000, { seat: 0 });
      const table = r.table_id as number;
      const out = await Promise.allSettled([
        sit(b, null, 10_000, { table, seat: 3 }),
        sit(c, null, 10_000, { table, seat: 3 }),
      ]);
      expect(out.filter((o) => o.status === "fulfilled")).toHaveLength(1);
      const rej = out.find((o) => o.status === "rejected") as PromiseRejectedResult;
      expect(String(rej.reason?.message)).toMatch(/SEAT_TAKEN|poker_seats_open_seat/);
      const loser = out[0]!.status === "rejected" ? b : c;
      expect(await bal(loser.id)).toBe(100_000);
      const fresh = async () => (await buildChain(randomBytes(32).toString("hex"), 2))[0]!;
      expect(await err(sit(a, null, 10_000, { table, head: await fresh() }))).toContain(
        "ALREADY_SEATED",
      );
      // Reusing a published chain is refused.
      const h = await liveHand(table);
      const winner = loser === b ? c : b;
      await revealAll(h.id, [a, winner]);
      const used = (
        await sql`select reveal from pvp_test.poker_hand_players where hand_id = ${h.id} and user_id = ${a.id}::uuid`
      )[0]!.reveal;
      expect(await err(sit(loser, 6, 10_000, { head: used }))).toContain("CHAIN_REUSED");
      // Up to max_tables_per_user simultaneous tables.
      const extra = [] as number[];
      for (const type of [1, 2])
        extra.push(
          (
            await sit(a, type, TIERS[type - 1]![5], {
              head: (await buildChain(randomBytes(32).toString("hex"), 2))[0],
            })
          ).table_id,
        );
      expect(
        await err(
          sit(a, 3, 1000, { head: (await buildChain(randomBytes(32).toString("hex"), 2))[0] }),
        ),
      ).toContain("TOO_MANY_TABLES");
      for (const t of extra) await leave(a, t);
      expect((await drive(table, [a, winner])).status).toBe("COMPLETED");
      await leave(a, table);
      await leave(winner, table);
      await drainTable(table, [a, winner]);
      expect((await reconcile()).ok).toBe(true);
    },
    LONG,
  );

  it(
    "keeps secrets, decks and other players' cards private",
    async () => {
      const a = await player(10_000);
      const b = await player(10_000);
      const r = await sit(a, 1, 500);
      const table = r.table_id as number;
      await sit(b, null, 500, { table });
      const h = await liveHand(table);
      await revealAll(h.id, [a, b]);
      for (const role of ["anon", "authenticated"] as const) {
        expect(
          await err(asRole(role, a.id, (tx) => tx`select * from pvp_test.poker_hand_secrets`)),
        ).toMatch(/permission denied/);
        expect(
          await err(asRole(role, a.id, (tx) => tx`select * from pvp_test.poker_hand_decks`)),
        ).toMatch(/permission denied/);
        expect(await err(asRole(role, a.id, (tx) => tx`select pvp_test.poker_tick()`))).toMatch(
          /permission denied/,
        );
        expect(
          await err(asRole(role, a.id, (tx) => tx`select pvp_test._poker_settle(${h.id}::bigint)`)),
        ).toMatch(/permission denied/);
        expect(
          await err(asRole(role, a.id, (tx) => tx`select pvp_test._poker_take_cash(1, 1, false)`)),
        ).toMatch(/permission denied/);
        expect(
          await err(
            asRole(role, a.id, (tx) => tx`select idempotency_key from pvp_test.poker_seats`),
          ),
        ).toMatch(/permission denied/);
      }
      expect(
        await err(asRole("anon", null, (tx) => tx`select * from pvp_test.poker_hole_cards`)),
      ).toMatch(/permission denied/);
      const mine = await asRole(
        "authenticated",
        a.id,
        (tx) => tx`select user_id from pvp_test.poker_hole_cards where hand_id = ${h.id}`,
      );
      expect(mine.map((x) => x.user_id)).toEqual([a.id]);
      const state = await asRole(
        "anon",
        null,
        (tx) => tx`select pvp_test.poker_table_state(${table}::bigint) r`,
      );
      expect(state[0]!.r.me).toBeNull();
      expect(state[0]!.r.hand.server_seed).toBeNull();
      expect(
        await err(
          asRole(
            "anon",
            null,
            (tx) =>
              tx`select pvp_test.poker_sit(null, 1::smallint, null, 200, ${"a".repeat(64)}, ${randomUUID()})`,
          ),
        ),
      ).toMatch(/permission denied/);
      expect((await drive(table, [a, b])).status).toBe("COMPLETED");
      await leave(a, table);
      await leave(b, table);
      await drainTable(table, [a, b]);
    },
    LONG,
  );

  it("writes no playthrough rows for players without open holds and feeds XP and profile stats", async () => {
    // Poker counts toward playthrough (poker-promo.integration.test.ts); nobody here holds a promo or referral.
    const ids = everyone.map((p) => p.id);
    for (const t of ["promo_wagers", "referral_reward_wagers"]) {
      const n = await sql.unsafe(
        `select count(*)::int n from pvp_test.${t} where game = 'poker' or user_id = any($1::uuid[])`,
        [ids],
      );
      expect(n[0]!.n).toBe(0);
    }
    expect(
      (
        await sql`select count(*)::int n from pvp_test.referral_play_events where game = 'poker'`
      )[0]!.n,
    ).toBe(0);
    const xp = await sql`select x.user_id, sum(x.xp_amount)::bigint xp from pvp_test.xp_events x
      where x.source_game = 'poker' group by x.user_id`;
    expect(xp.length).toBeGreaterThan(0);
    for (const row of xp) {
      const contested = (
        await sql`select coalesce(sum(hp.wagered), 0)::bigint w from pvp_test.poker_hand_players hp
        join pvp_test.poker_hands h on h.id = hp.hand_id
        where hp.user_id = ${row.user_id} and h.status = 'COMPLETED' and array_length(h.board, 1) >= 3`
      )[0]!.w;
      expect(Number(row.xp)).toBeLessThanOrEqual(Math.floor(Number(contested) / 10));
      expect(Number(row.xp)).toBeGreaterThan(0);
    }
    const u = xp[0]!.user_id as string;
    const stats = (await as(u, (tx) => tx`select pvp_test.get_profile_stats(${u}::uuid) r`))[0]!.r;
    const agg = (
      await sql`select count(*) filter (where hp.total_bet > 0)::int played, coalesce(sum(hp.wagered), 0)::bigint wagered
      from pvp_test.poker_hand_players hp join pvp_test.poker_hands h on h.id = hp.hand_id
      where hp.user_id = ${u}::uuid and h.status = 'COMPLETED'`
    )[0]!;
    expect(stats.games_played).toBe(agg.played);
    expect(stats.total_wagered).toBe(Number(agg.wagered));
  });

  it("reports poker pot shares, excluding uncalled returns, in the admin cash-flow report", async () => {
    const want = Number(
      (
        await sql`select coalesce(sum(hp.won), 0) w from pvp_test.poker_hand_players hp
        join pvp_test.poker_hands h on h.id = hp.hand_id where h.status = 'COMPLETED' and hp.won > 0`
      )[0]!.w,
    );
    expect(want).toBeGreaterThan(0);
    const rollback = new Error("rollback");
    let rows: Row[] = [];
    await sql
      .begin(async (tx) => {
        // The admin role, live session and step-up gates are covered by the security suite.
        await tx`create or replace function pvp_test.has_role(_user_id uuid, _role pvp_test.app_role) returns boolean
          language sql as 'select true'`;
        await tx`create or replace function pvp_test._assert_live_session() returns void
          language sql as 'select'`;
        await tx`create or replace function pvp_test._require_admin_stepup() returns void
          language sql as 'select'`;
        rows = (await tx`select pvp_test.admin_ledger_cashflow() r`)[0]!.r.winnings as Row[];
        throw rollback;
      })
      .catch((e) => {
        if (e !== rollback) throw e;
      });
    const poker = rows.find((r) => r.game === "Poker")!;
    expect(Number(poker.all_time)).toBe(want);
    expect(rows.map((r) => r.game)).toEqual([
      "Jackpot",
      "Coinflip",
      "Roulette",
      "Slott",
      "Slott bonus",
      "Poker",
    ]);
  });

  it("runs inside the existing Slott worker tick", async () => {
    const r = (await as(null, (tx) => tx`select pvp_test.slot_tick_with_poker() r`))[0]!.r;
    expect(r).toHaveProperty("slot");
    expect(r.poker).toHaveProperty("processed");
  });

  it(
    "conserves every cent across players, the house and the withdrawal basis",
    async () => {
      for (let i = 0; i < 5; i++) {
        const open = await sql`select id from pvp_test.poker_tables where hand_id is not null`;
        if (!open.length) break;
        await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where hand_id is not null`;
        await tick();
      }
      const rec = await reconcile();
      expect(rec).toMatchObject({
        ok: true,
        open_seats: 0,
        closed_seats: 0,
        hands: 0,
        locked_coverage: 0,
      });
      let held = 0;
      for (const p of everyone) held += (await bal(p.id)) + (await bal(p.id, "user_locked"));
      const totalIn = [...credited.values()].reduce((x, y) => x + y, 0);
      expect(held + (await houseRevenue())).toBe(totalIn);
      const escrow = (
        await sql`select coalesce(sum(balance), 0)::bigint b from pvp_test.wallet_accounts
      where owner_id is null and kind = 'game_escrow' and asset = 'USD' and account_type = 'real'`
      )[0]!.b;
      expect(Number(escrow)).toBe(0);
      await sql`select pvp_test._withdraw_basis_sync()`;
      await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
      const fees = (
        await sql`select coalesce(sum(fee_total), 0)::bigint f from pvp_test.poker_hands where status = 'COMPLETED'`
      )[0]!.f;
      expect(await houseRevenue()).toBe(Number(fees));
    },
    LONG,
  );
});

/** Finishes any hand still running on the table so leaving players are cashed out. */
async function drainTable(table: number, players: Player[]) {
  for (let i = 0; i < 20; i++) {
    const h = await latestHand(table);
    const open = (
      await sql`select count(*)::int n from pvp_test.poker_seats where table_id = ${table} and status = 'SEATED'`
    )[0]!.n;
    if (!open && (!h || ["COMPLETED", "VOIDED"].includes(h.status))) return;
    if (h?.status === "COMMIT") await revealAll(h.id, players);
    await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
    await sql`update pvp_test.poker_hands set action_deadline = clock_timestamp() - interval '1 second'
      where table_id = ${table} and status = 'BETTING'`;
    await tick();
  }
  throw new Error("TABLE_DID_NOT_DRAIN");
}
