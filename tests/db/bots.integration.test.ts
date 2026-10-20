/**
 * House bots stay disabled and unfunded until an operator turns them on.
 * These checks use the isolated pvp_test schema. The test funds bot_bankroll
 * from the test faucet; production does not.
 */
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { testDatabaseUrl } from "./test-url";
import { buildChain, randomSecret } from "../../src/lib/fairness/poker";
import { botRoll, chooseBotAction, type BotStyle, type BotView } from "../../src/lib/poker/bot";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
const LONG = 240_000;

type Row = Record<string, unknown>;

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

async function newUser(name: string) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${name}, true)`);
  return id;
}

const create = (uid: string, amount = 500, side: "HEADS" | "TAILS" = "HEADS", key = randomUUID()) =>
  as(uid, async (tx) => {
    const [row] = await tx`select pvp_test.coinflip_create(${amount}, ${side}::pvp_test.coin_side, ${key}) r`;
    return row!.r as { game_id: number };
  });

const joinG = (uid: string, gid: number, key = randomUUID()) =>
  as(uid, async (tx) => {
    const [row] = await tx`select pvp_test.coinflip_join(${gid}, ${key}) r`;
    return row!.r as { opponent_id?: string };
  });

const callFlip = (uid: string, gid: number, key = randomUUID()) =>
  as(uid, async (tx) => {
    const [row] = await tx`select pvp_test.coinflip_call_bot(${gid}, ${key}) r`;
    return row!.r as { joined: boolean; duplicate?: boolean; opponent_id?: string; reason?: string };
  });

const game = async (id: number) =>
  (await sql`select * from pvp_test.coinflip_games where id = ${id}`)[0] as Row;

const expectErr = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(code);

async function domain() {
  const [row] = await sql`select asset, account_type from pvp_test.money_domain_config`;
  return row as { asset: string; account_type: string };
}

async function bankroll(asset: string, accountType: string) {
  const [row] = await sql`select coalesce(balance, 0)::bigint b from pvp_test.wallet_accounts
    where owner_id is null and kind = 'bot_bankroll' and asset = ${asset} and account_type = ${accountType}`;
  return Number(row?.b ?? 0);
}

async function userBal(uid: string, kind: string, asset: string, accountType: string) {
  const [row] = await sql`select coalesce(balance, 0)::bigint b from pvp_test.wallet_accounts
    where owner_id = ${uid} and kind = ${kind} and asset = ${asset} and account_type = ${accountType}`;
  return Number(row?.b ?? 0);
}

async function invariants() {
  const [sum] = await sql`select coalesce(sum(balance), 0)::bigint s from pvp_test.wallet_accounts`;
  expect(Number(sum!.s)).toBe(0);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a
    left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount), 0)`;
  expect(mism.length).toBe(0);
  const inv = (await sql`select pvp_test.money_real_invariants() r`)[0]!.r as {
    ok_custody_equals_liabilities: boolean;
  };
  expect(inv.ok_custody_equals_liabilities).toBe(true);
}

/** Test-only capital. Production funding is bot_allocate_from_revenue, which these tests never call. */
async function fundBots(cents: number, asset: string, accountType: string) {
  await sql.begin(async (tx) => {
    const bank = (await tx`select pvp_test._system_account('bot_bankroll', ${asset}, ${accountType}) id`)[0]!.id;
    const faucet = (await tx`select pvp_test._system_account('test_faucet', ${asset}, ${accountType}) id`)[0]!.id;
    const id = (
      await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type)
        values ('bot_fund', ${randomUUID()}, ${accountType}) returning id`
    )[0]!.id as string;
    await tx`select pvp_test._post(${id}::uuid, ${faucet}::uuid, ${-cents}::bigint)`;
    await tx`select pvp_test._post(${id}::uuid, ${bank}::uuid, ${cents}::bigint)`;
  });
}

async function enableBots(exposure: number) {
  await sql`update pvp_test.bot_config set enabled = true, coinflip_enabled = true, poker_enabled = true,
    max_exposure_cents = ${exposure}`;
  await sql`update pvp_test.poker_config set enabled = true`;
}

d("house bots", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, LONG);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  beforeEach(async () => {
    await sql`truncate pvp_test.profiles, pvp_test.wallet_accounts, pvp_test.ledger_postings,
      pvp_test.ledger_transactions restart identity cascade`;
    await sql`select pvp_test.bot_seed_identities()`;
    await sql`select pvp_test._system_account('bot_bankroll', 'USD', 'real')`;
    await sql`select pvp_test._system_account('bot_bankroll', 'TEST_USD', 'test_credit')`;
    await sql`update pvp_test.bot_config set enabled = false, coinflip_enabled = false, poker_enabled = false,
      max_exposure_cents = 0`;
    await sql`update pvp_test.coinflip_config set pre_delay_ms = 20, animation_ms = 20, waiting_timeout_seconds = 120`;
  });

  it("ships disabled, with an empty bot bankroll and balanced books", async () => {
    const cfg = (await sql`select pvp_test.bot_public_config() c`)[0]!.c as {
      coinflip: boolean;
      poker: boolean;
    };
    expect(cfg).toEqual({ coinflip: false, poker: false });
    const dom = await domain();
    expect(await bankroll(dom.asset, dom.account_type)).toBe(0);
    await invariants();
    const [def] = await sql`select pg_get_functiondef('pvp_test.admin_ledger_cashflow()'::regprocedure) d`;
    expect(String(def!.d)).toContain("bal.bot_bankroll");
  });

  it("refuses a coinflip bot while the flag is off and leaves the seed alone", async () => {
    const a = await newUser("flipper");
    const { game_id } = await create(a);
    const before = await game(game_id);
    await expectErr(callFlip(a, game_id), "BOTS_DISABLED");
    const after = await game(game_id);
    expect(after.status).toBe("WAITING");
    expect(after.opponent_id).toBeNull();
    expect(after.server_seed_hash).toBe(before.server_seed_hash);
    const calls = await sql`select 1 from pvp_test.bot_calls`;
    expect(calls.length).toBe(0);
  });

  it("lets a human keep the seat when they join first", async () => {
    const a = await newUser("host");
    const b = await newUser("guest");
    const { game_id } = await create(a);
    await joinG(b, game_id);
    const raced = await callFlip(a, game_id);
    expect(raced.joined).toBe(false);
    expect(raced.reason).toBe("GAME_NOT_JOINABLE");
    const g = await game(game_id);
    expect(g.opponent_id).toBe(b);
    const entries = await sql`select user_id from pvp_test.coinflip_entries where game_id = ${game_id}`;
    expect(entries.map((e) => e.user_id).sort()).toEqual([a, b].sort());
  });

  it("joins a funded bot without changing the committed seed, then sweeps the stake", async () => {
    const dom = await domain();
    await fundBots(50_000, dom.asset, dom.account_type);
    await enableBots(50_000);
    const a = await newUser("caller");
    const { game_id } = await create(a, 500);
    const before = await game(game_id);
    const [secretBefore] = await sql`select encode(server_seed, 'hex') s from pvp_test.coinflip_game_secrets where game_id = ${game_id}`;
    const key = randomUUID();
    const joined = await callFlip(a, game_id, key);
    expect(joined.joined).toBe(true);
    const again = await callFlip(a, game_id, key);
    expect(again.duplicate).toBe(true);
    expect(again.opponent_id).toBe(joined.opponent_id);
    const mid = await game(game_id);
    expect(mid.status).toBe("READY");
    expect(mid.server_seed_hash).toBe(before.server_seed_hash);
    const [bot] = await sql`select is_bot from pvp_test.profiles where id = ${joined.opponent_id!}`;
    expect(bot!.is_bot).toBe(true);
    const [secretAfter] = await sql`select encode(server_seed, 'hex') s from pvp_test.coinflip_game_secrets where game_id = ${game_id}`;
    expect(secretAfter!.s).toBe(secretBefore!.s);

    await new Promise((r) => setTimeout(r, 80));
    await as(null, async (tx) => {
      await tx`select pvp_test.coinflip_tick()`;
    });
    const done = await game(game_id);
    expect(done.status).toBe("COMPLETED");
    expect(done.server_seed_hash).toBe(before.server_seed_hash);
    expect(await userBal(joined.opponent_id!, "user_available", dom.asset, dom.account_type)).toBe(0);
    expect(await userBal(joined.opponent_id!, "user_locked", dom.asset, dom.account_type)).toBe(0);
    await expectErr(
      sql`select pvp_test._assert_reward_holds(${joined.opponent_id!}::uuid, 1000, 100)`,
      "BOT_NOT_WITHDRAWABLE",
    );
    await invariants();
  });

  it("matches the TypeScript decision for the same public cards", async () => {
    const styles: BotStyle[] = ["casual", "standard", "competitive"];
    const spots: Array<Omit<BotView, "style" | "roll">> = [
      {
        hole: [12, 25],
        board: [],
        pot: 30,
        heroStack: 400,
        heroStreetBet: 10,
        effectiveStack: 400,
        opponents: 1,
        position: "late",
        raisesThisStreet: 0,
        bigBlind: 10,
        legal: {
          toCall: 0,
          canFold: true,
          canCheck: true,
          canCall: false,
          callAmount: 0,
          canRaise: true,
          minRaiseTo: 20,
          maxRaiseTo: 410,
          currentBet: 10,
        },
      },
      {
        hole: [0, 18],
        board: [],
        pot: 200,
        heroStack: 500,
        heroStreetBet: 0,
        effectiveStack: 500,
        opponents: 2,
        position: "early",
        raisesThisStreet: 1,
        bigBlind: 10,
        legal: {
          toCall: 80,
          canFold: true,
          canCheck: false,
          canCall: true,
          callAmount: 80,
          canRaise: true,
          minRaiseTo: 160,
          maxRaiseTo: 500,
          currentBet: 80,
        },
      },
      {
        hole: [37, 19],
        board: [24, 7, 39],
        pot: 80,
        heroStack: 900,
        heroStreetBet: 0,
        effectiveStack: 900,
        opponents: 1,
        position: "middle",
        raisesThisStreet: 0,
        bigBlind: 10,
        legal: {
          toCall: 0,
          canFold: true,
          canCheck: true,
          canCall: false,
          callAmount: 0,
          canRaise: true,
          minRaiseTo: 20,
          maxRaiseTo: 900,
          currentBet: 0,
        },
      },
    ];
    for (const spot of spots) {
      for (const style of styles) {
        for (const version of [1, 4]) {
          const roll = botRoll(42, 3, spot.board.length ? "FLOP" : "PREFLOP", version);
          const js = chooseBotAction({ ...spot, style, roll });
          const [row] = await sql`select pvp_test._poker_bot_roll(42, 3, ${spot.board.length ? "FLOP" : "PREFLOP"}, ${version}) r`;
          expect(Number(row!.r)).toBe(roll);
          const legal = {
            can_fold: spot.legal.canFold,
            can_check: spot.legal.canCheck,
            can_call: spot.legal.canCall,
            call_amount: spot.legal.callAmount,
            can_raise: spot.legal.canRaise,
            min_raise_to: spot.legal.minRaiseTo,
            max_raise_to: spot.legal.maxRaiseTo,
            current_bet: spot.legal.currentBet,
          };
          const [dec] = await sql`select pvp_test._poker_bot_decide(
            ${spot.hole}::smallint[],
            ${spot.board}::smallint[],
            ${spot.pot}::bigint,
            ${spot.heroStack}::bigint,
            ${spot.heroStreetBet}::bigint,
            ${spot.effectiveStack}::bigint,
            ${spot.opponents},
            ${spot.position},
            ${spot.raisesThisStreet},
            ${spot.bigBlind}::bigint,
            ${style},
            ${roll},
            ${sql.json(legal)}
          ) r`;
          const got = dec!.r as { action: string; amount: number };
          expect(got.action).toBe(js.action);
          expect(Number(got.amount)).toBe(js.amount);
        }
      }
    }
  });

  it("seats one labeled bot and cashes it out once the human leaves", async () => {
    const dom = await domain();
    await fundBots(50_000, dom.asset, dom.account_type);
    await sql`update pvp_test.poker_config set enabled = true`;
    const a = await newUser("seatone");
    const links = await buildChain(randomSecret(), 16);
    const sat = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.poker_sit(null, 1::smallint, null, 200, ${links[0]!}, ${randomUUID()}) r`;
      return row!.r as { table_id: number; seat_no: number };
    });
    await sql`update pvp_test.poker_seats set chain_link = null where user_id = ${a} and status = 'SEATED'`;
    await expectErr(
      as(a, (tx) => tx`select pvp_test.poker_call_bot(${sat.table_id}, ${randomUUID()})`),
      "BOTS_DISABLED",
    );
    await enableBots(50_000);
    const called = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.poker_call_bot(${sat.table_id}, ${randomUUID()}) r`;
      return row!.r as { joined: boolean; user_id: string; seat_no: number };
    });
    expect(called.joined).toBe(true);
    const state = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.poker_table_state(${sat.table_id}) r`;
      return row!.r as { seats: { user_id: string; is_bot: boolean }[]; table: { seated: number } };
    });
    const botSeat = state.seats.find((s) => s.user_id === called.user_id);
    expect(botSeat?.is_bot).toBe(true);
    expect(state.table.seated).toBe(2);
    const lobby = (await sql`select pvp_test.poker_lobby() r`)[0]!.r as {
      types: { id: number; players: number }[];
    };
    expect(lobby.types.find((t) => t.id === 1)?.players).toBe(1);
    const open = await sql`select id from pvp_test.poker_hands where table_id = ${sat.table_id}`;
    expect(open.length).toBe(0);
    await as(a, (tx) => tx`select pvp_test.poker_leave(${sat.table_id})`);
    const tick = await as(null, async (tx) => {
      const [row] = await tx`select pvp_test._poker_tick_table(${sat.table_id}) r`;
      return row!.r as string;
    });
    expect(tick).toBe("cashed_out");
    const left = await sql`select id from pvp_test.poker_seats where table_id = ${sat.table_id} and status = 'SEATED'`;
    expect(left.length).toBe(0);
    expect(await userBal(called.user_id, "user_available", dom.asset, dom.account_type)).toBe(0);
    expect(await userBal(called.user_id, "user_locked", dom.asset, dom.account_type)).toBe(0);
    expect(await bankroll(dom.asset, dom.account_type)).toBe(50_000);
    await invariants();
  });
});
