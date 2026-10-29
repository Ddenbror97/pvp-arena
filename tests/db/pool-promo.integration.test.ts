/**
 * 8-ball accepts promo and partner credit the way the other games do.
 * Eligible cash is spent first. A bonus stake stays bonus after settlement,
 * and a partner who loses to a regular player records partner profit.
 * Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";
import { freshTable, stateHash, type TableState } from "../../src/lib/pool/rules";
import { bytesFromHex } from "../../src/lib/pool/verify";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

async function as<T>(uid: string, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

d("pool promo and partner credit", () => {
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

  const house = async () =>
    (
      await sql`select pvp_test._system_account('house_bankroll', 'USD', 'real') id`
    )[0]!.id as string;

  const acct = async (uid: string) =>
    (
      await sql`select pvp_test._user_account(${uid}::uuid, 'user_available', 'USD', 'real') id`
    )[0]!.id as string;

  async function user(name: string) {
    const id = randomUUID();
    await sql`select pvp_test.ensure_profile(${(name + id.replace(/-/g, "")).slice(0, 20)}, true)
      from (select set_config('test.uid', ${id}, true)) c`;
    return id;
  }

  async function creditBonus(uid: string, cents: number) {
    const bank = await house();
    const available = await acct(uid);
    await sql.begin(async (tx) => {
      const txId = (
        await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
          values ('promo_reward', ${randomUUID()}, 'real', ${uid}::uuid, 'promo') returning id`
      )[0]!.id;
      await tx`select pvp_test._post(${txId}::uuid, ${bank}::uuid, ${-cents}::bigint)`;
      await tx`select pvp_test._post(${txId}::uuid, ${available}::uuid, ${cents}::bigint)`;
    });
  }

  async function creditCash(uid: string, cents: number) {
    const external = (
      await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`
    )[0]!.id as string;
    const available = await acct(uid);
    await sql.begin(async (tx) => {
      const txId = (
        await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
          values ('deposit', ${randomUUID()}, 'real', ${uid}::uuid, 'deposit') returning id`
      )[0]!.id;
      await tx`select pvp_test._post(${txId}::uuid, ${external}::uuid, ${-cents}::bigint)`;
      await tx`select pvp_test._post(${txId}::uuid, ${available}::uuid, ${cents}::bigint)`;
    });
  }

  const basis = async (uid: string) => {
    await sql`select pvp_test._withdraw_basis_sync()`;
    const row = (
      await sql`select eligible, bonus from pvp_test.withdraw_basis_bucket where user_id = ${uid}::uuid`
    )[0];
    return { eligible: Number(row?.eligible ?? 0), bonus: Number(row?.bonus ?? 0) };
  };

  async function openPlaying(a: string, b: string): Promise<number> {
    const created = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    expect(created.role).toBe("created");
    const joined = await as(b, async (tx) => {
      const [row] = await tx`select pvp_test.pool_join(${created.match_id}, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    expect(joined.role).toBe("joined");
    expect(joined.match_id).toBe(created.match_id);
    const [secret] = await sql`select pvp_test.pool_read_secret(${created.match_id}) seed`;
    const table: TableState = freshTable(bytesFromHex(String(secret.seed)));
    await sql`select pvp_test.pool_begin(${created.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    const [started] =
      await sql`select status, state_hash from pvp_test.pool_matches where id = ${created.match_id}`;
    expect(started.status).toBe("PLAYING");
    expect(started.state_hash).toBe(stateHash(table));
    return created.match_id;
  }

  it("stakes promo credit and keeps the payout as bonus", async () => {
    const a = await user("promoA");
    const b = await user("promoB");
    await creditBonus(a, 1000);
    await creditBonus(b, 1000);
    expect(await basis(a)).toEqual({ eligible: 0, bonus: 1000 });

    const waiting = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sql`
      update pvp_test.pool_matches
      set expires_at = clock_timestamp() - interval '1 second'
      where id = ${waiting.match_id}
    `;
    await sql`select pvp_test._pool_tick_one(${waiting.match_id})`;
    expect(await basis(a)).toEqual({ eligible: 0, bonus: 1000 });

    const matchId = await openPlaying(a, b);
    await sql`select pvp_test.pool_forfeit_seat(${matchId}, 'B')`;
    const [done] =
      await sql`select status, winner_id, payout_amount, fee_amount from pvp_test.pool_matches where id = ${matchId}`;
    expect(done.status).toBe("COMPLETED");
    expect(done.winner_id).toBe(a);
    expect(Number(done.payout_amount)).toBe(190);
    expect(Number(done.fee_amount)).toBe(10);
    expect(await basis(a)).toEqual({ eligible: 0, bonus: 1090 });
    expect(await basis(b)).toEqual({ eligible: 0, bonus: 900 });
  });

  it("keeps bonus in a mixed pot when the cash player wins", async () => {
    const cash = await user("cashP");
    const bonus = await user("bonusP");
    await creditCash(cash, 1000);
    await creditBonus(bonus, 1000);
    const matchId = await openPlaying(cash, bonus);
    await sql`select pvp_test.pool_forfeit_seat(${matchId}, 'B')`;
    expect(await basis(cash)).toEqual({ eligible: 995, bonus: 95 });
    expect(await basis(bonus)).toEqual({ eligible: 0, bonus: 900 });
  });

  it("records partner profit when a partner loses the match", async () => {
    const winner = await user("regWin");
    const partner = await user("partLos");
    await creditCash(winner, 1000);
    await creditBonus(partner, 1000);
    await sql`insert into pvp_test.partners (user_id, active, commission_bps, created_by)
      values (${partner}::uuid, true, 0, ${winner}::uuid)`;
    const matchId = await openPlaying(winner, partner);
    await sql`select pvp_test.pool_forfeit_seat(${matchId}, 'B')`;
    const [profit] = await sql`select game, profit_cents, partner_user_id, user_id
      from pvp_test.partner_profit_events where game = 'pool' and game_id = ${matchId}`;
    expect(profit.partner_user_id).toBe(partner);
    expect(profit.user_id).toBe(winner);
    expect(Number(profit.profit_cents)).toBe(90);
    expect(await basis(winner)).toEqual({ eligible: 995, bonus: 95 });
  });
});
