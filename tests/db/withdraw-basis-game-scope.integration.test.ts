/**
 * Every game numbers its rounds independently, so two games can share a game_id.
 * The withdrawal basis must keep their open stakes apart: settling or refunding one
 * game must not pool, consume or delete another game's stake, and bonus-funded
 * winnings must never come back as withdrawable cash. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

type Leg = [account: string, amount: number];

d("withdraw basis game scope", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await sql`select pvp_test._system_account('house_bankroll', 'USD', 'real')`;
    await sql`update pvp_test.wallet_accounts set balance = 100000000
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  const sys = async (kind: string) =>
    (
      await sql`select pvp_test._system_account(${kind}::pvp_test.account_kind, 'USD', 'real') id`
    )[0]!.id as string;
  const acct = async (uid: string, kind: string) =>
    (
      await sql`select pvp_test._user_account(${uid}::uuid, ${kind}::pvp_test.account_kind, 'USD', 'real') id`
    )[0]!.id as string;

  async function user(name: string) {
    const id = randomUUID();
    await sql`select pvp_test.ensure_profile(${(name + id.replace(/-/g, "")).slice(0, 20)}, true)
      from (select set_config('test.uid', ${id}, true)) c`;
    await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
      select ${id}::uuid, 'user_locked', 'USD', 'real'
      where not exists (select 1 from pvp_test.wallet_accounts
        where owner_id = ${id}::uuid and kind = 'user_locked' and asset = 'USD' and account_type = 'real')`;
    return id;
  }

  async function post(kind: string, gameId: number | null, legs: Leg[]) {
    await sql.begin(async (tx) => {
      const t = (
        await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, game_id)
        values (${kind}::pvp_test.tx_kind, ${randomUUID()}, 'real', ${gameId}) returning id`
      )[0]!.id;
      for (const [a, amount] of legs)
        await tx`select pvp_test._post(${t}::uuid, ${a}::uuid, ${amount}::bigint)`;
    });
  }

  const basis = async (uid: string) => {
    await sql`select pvp_test._withdraw_basis_sync()`;
    const r = (
      await sql`select eligible, bonus from pvp_test.withdraw_basis_bucket where user_id = ${uid}::uuid`
    )[0];
    return { eligible: Number(r?.eligible ?? 0), bonus: Number(r?.bonus ?? 0) };
  };

  it("keeps a coinflip and a roulette round with the same id apart", async () => {
    const house = await sys("house_bankroll");
    const ext = await sys("external_custody");
    const bonusPlayer = await user("gsb");
    const cashPlayer = await user("gsc");
    const [bAvail, bLocked] = [
      await acct(bonusPlayer, "user_available"),
      await acct(bonusPlayer, "user_locked"),
    ];
    const [cAvail, cLocked] = [
      await acct(cashPlayer, "user_available"),
      await acct(cashPlayer, "user_locked"),
    ];
    const gameId = 900_000_001;

    await post("promo_reward", null, [
      [house, -1000],
      [bAvail, 1000],
    ]);
    await post("deposit", null, [
      [ext, -1000],
      [cAvail, 1000],
    ]);

    // Bonus-funded coinflip game N and cash-funded roulette round N are open at once.
    await post("coinflip_entry", gameId, [
      [bAvail, -1000],
      [bLocked, 1000],
    ]);
    await post("roulette_entry", gameId, [
      [cAvail, -1000],
      [cLocked, 1000],
    ]);
    await sql`select pvp_test._withdraw_basis_sync()`;
    const stakeOf = async (uid: string) =>
      (
        await sql`select eligible, bonus from pvp_test.withdraw_basis_stake
        where game_id = ${gameId} and user_id = ${uid}::uuid`
      ).map((r) => [Number(r.eligible), Number(r.bonus)]);
    expect(await stakeOf(bonusPlayer)).toEqual([[0, 1000]]);
    expect(await stakeOf(cashPlayer)).toEqual([[1000, 0]]);

    // Roulette N pays the cash player 2000: all of it is deposit-funded.
    await post("roulette_settlement", gameId, [
      [cLocked, -1000],
      [house, -1000],
      [cAvail, 2000],
    ]);
    expect(await basis(cashPlayer)).toEqual({ eligible: 2000, bonus: 0 });
    expect(await stakeOf(cashPlayer)).toEqual([]);
    expect(await stakeOf(bonusPlayer)).toEqual([[0, 1000]]);

    // Coinflip N pays the bonus player 2000: still bonus, never withdrawable cash.
    await post("coinflip_settlement", gameId, [
      [bLocked, -1000],
      [house, -1000],
      [bAvail, 2000],
    ]);
    expect(await basis(bonusPlayer)).toEqual({ eligible: 0, bonus: 2000 });

    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });

  it("refunds only the refunded game's stake and leaderboard rows", async () => {
    const ext = await sys("external_custody");
    const a = await user("gra");
    const b = await user("grb");
    const [aAvail, aLocked] = [await acct(a, "user_available"), await acct(a, "user_locked")];
    const [bAvail, bLocked] = [await acct(b, "user_available"), await acct(b, "user_locked")];
    const gameId = 900_000_002;
    await post("deposit", null, [
      [ext, -500],
      [aAvail, 500],
    ]);
    await post("deposit", null, [
      [ext, -500],
      [bAvail, 500],
    ]);
    await post("slot_entry", gameId, [
      [aAvail, -500],
      [aLocked, 500],
    ]);
    await post("jackpot_entry", gameId, [
      [bAvail, -500],
      [bLocked, 500],
    ]);

    await post("slot_refund", gameId, [
      [aLocked, -500],
      [aAvail, 500],
    ]);
    await sql`select pvp_test._withdraw_basis_sync()`;
    const stakes =
      await sql`select user_id from pvp_test.withdraw_basis_stake where game_id = ${gameId}`;
    expect(stakes.map((r) => r.user_id)).toEqual([b]);
    const ledgerStakes = await sql`select s.user_id from pvp_test.withdraw_basis_ledger_stake s
      join pvp_test.ledger_transactions t on t.id = s.ledger_tx_id where t.game_id = ${gameId}`;
    expect(ledgerStakes.map((r) => r.user_id)).toEqual([b]);
    expect(await basis(a)).toEqual({ eligible: 500, bonus: 0 });

    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });
});
