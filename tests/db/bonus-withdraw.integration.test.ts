/**
 * Bonus cashout floor: this suite restores the $20 deposit gate and $20 minimum,
 * and a payout keeps the stake's source. Isolated schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { fundTestTreasury, migrateTestSchemaToReal } from "./money";
import { BTC_QUOTE_RATE, quoteExpiry, quotedSats } from "./btc-quote";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

const BTC = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const FEED = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
const PRICE = 2_500_000_000;

d("bonus withdrawal floor", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    const mins = await sql`select
      (select min_withdrawal_cents from pvp_test.crypto_settings) as settings,
      (select min_withdrawal_cents from pvp_test.chain_networks where chain_id = 8453) as chain`;
    expect(Number(mins[0].settings)).toBe(2000);
    expect(Number(mins[0].chain)).toBe(2000);
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await fundTestTreasury(sql);
    await sql.unsafe(`alter table pvp_test.chain_networks disable trigger user;
      update pvp_test.crypto_settings set min_withdrawal_cents = 2000, daily_limit_cents = 100000000, daily_global_limit_cents = 1000000000, auto_approve_cents = 100000000, withdrawal_fee_cents = 0;
      update pvp_test.chain_networks set min_withdrawal_cents = 2000, is_enabled = true where chain_id in (8453, 84532);
      alter table pvp_test.chain_networks enable trigger user;
      alter table pvp_test.chain_assets disable trigger user;
      update pvp_test.chain_assets set is_enabled = true, ledger_asset = 'USD', ledger_account_type = 'real' where chain_id in (8453, 84532);
      alter table pvp_test.chain_assets enable trigger user;`);
    await sql`select pvp_test.crypto_record_price(8453, 'ETH', ${FEED}, 1, ${PRICE}, now(), now())`;
    await sql`select pvp_test.crypto_record_inventory(8453, 0, ${(10n ** 24n).toString()}, 0, ${(10n ** 12n).toString()}, ${PRICE}, true, true)`;
    await sql`select pvp_test._system_account('house_bankroll', 'USD', 'real')`;
    await sql`update pvp_test.wallet_accounts set balance = 100000
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  const err = async (p: Promise<unknown>) => {
    try {
      await p;
      return "";
    } catch (e) {
      return String((e as Error).message);
    }
  };

  async function user(name: string) {
    const id = randomUUID();
    const username = (name + id.replace(/-/g, "")).slice(0, 20);
    await sql`select pvp_test.ensure_profile(${username}, true)
      from (select set_config('test.uid', ${id}, true)) c`;
    await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
      select ${id}::uuid, 'user_locked', 'USD', 'real'
      where not exists (
        select 1 from pvp_test.wallet_accounts
        where owner_id = ${id}::uuid and kind = 'user_locked' and asset = 'USD' and account_type = 'real'
      )`;
    const wallet = "0x" + randomBytes(20).toString("hex");
    await sql`insert into pvp_test.user_wallets (
      user_id, address, normalized_address, is_verified, is_primary, verified_at, became_primary_at
    ) values (
      ${id}::uuid, ${wallet}, ${wallet}, true, true, now() - interval '48 hours', now() - interval '48 hours'
    )`;
    return id;
  }

  async function walletOf(uid: string) {
    const row = (
      await sql`select normalized_address from pvp_test.user_wallets
        where user_id = ${uid}::uuid and is_verified
        order by is_primary desc, verified_at desc
        limit 1`
    )[0];
    if (!row) throw new Error("missing verified wallet");
    return row.normalized_address as string;
  }

  async function acct(uid: string, kind: string) {
    const id = (
      await sql`select pvp_test._user_account(${uid}::uuid, ${kind}::pvp_test.account_kind, 'USD', 'real') id`
    )[0].id as string | null;
    if (!id) throw new Error(`missing ${kind}`);
    return id;
  }

  async function sys(kind: string) {
    return (
      await sql`select pvp_test._system_account(${kind}::pvp_test.account_kind, 'USD', 'real') id`
    )[0].id as string;
  }

  async function deposit(uid: string, cents: number) {
    const external = await sys("external_custody");
    const available = await acct(uid, "user_available");
    await sql.begin(async (db) => {
      const id = (
        await db`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type)
          values ('deposit'::pvp_test.tx_kind, ${randomUUID()}, 'real') returning id`
      )[0].id as string;
      await db`select pvp_test._post(${id}::uuid, ${external}::uuid, ${-cents}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${available}::uuid, ${cents}::bigint)`;
    });
  }

  async function bonus(uid: string, kind: string, cents: number) {
    const house = await sys("house_bankroll");
    const available = await acct(uid, "user_available");
    await sql.begin(async (db) => {
      const id = (
        await db`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type)
          values (${kind}::pvp_test.tx_kind, ${randomUUID()}, 'real') returning id`
      )[0].id as string;
      await db`select pvp_test._post(${id}::uuid, ${house}::uuid, ${-cents}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${available}::uuid, ${cents}::bigint)`;
    });
  }

  async function entry(uid: string, gameId: number, cents: number) {
    const available = await acct(uid, "user_available");
    const locked = await acct(uid, "user_locked");
    await sql.begin(async (db) => {
      const id = (
        await db`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, game_id)
          values ('coinflip_entry'::pvp_test.tx_kind, ${randomUUID()}, 'real', ${gameId}) returning id`
      )[0].id as string;
      await db`select pvp_test._post(${id}::uuid, ${available}::uuid, ${-cents}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${locked}::uuid, ${cents}::bigint)`;
    });
  }

  async function settle(
    gameId: number,
    stakes: { uid: string; stake: number }[],
    winner: string,
    payout: number,
    fee: number,
  ) {
    const locked = await Promise.all(
      stakes.map(async (s) => ({ ...s, account: await acct(s.uid, "user_locked") })),
    );
    const escrow = await sys("game_escrow");
    const house = await sys("house_revenue");
    const won = await acct(winner, "user_available");
    const pot = stakes.reduce((n, s) => n + s.stake, 0);
    await sql.begin(async (db) => {
      const id = (
        await db`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, game_id)
          values ('coinflip_settlement'::pvp_test.tx_kind, ${randomUUID()}, 'real', ${gameId}) returning id`
      )[0].id as string;
      for (const s of locked)
        await db`select pvp_test._post(${id}::uuid, ${s.account}::uuid, ${-s.stake}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${escrow}::uuid, ${pot}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${escrow}::uuid, ${-pot}::bigint)`;
      await db`select pvp_test._post(${id}::uuid, ${won}::uuid, ${payout}::bigint)`;
      if (fee !== 0)
        await db`select pvp_test._post(${id}::uuid, ${house}::uuid, ${fee}::bigint)`;
    });
  }

  async function assertBasisParity() {
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  }

  async function basis(uid: string) {
    const row = (await sql`select pvp_test._withdraw_basis(${uid}::uuid) b`)[0].b as {
      deposits: number;
      eligible: number;
      bonus: number;
      room: number;
    };
    return {
      deposits: Number(row.deposits),
      eligible: Number(row.eligible),
      bonus: Number(row.bonus),
      room: Number(row.room),
    };
  }

  async function bal(uid: string) {
    return Number(
      (
        await sql`select balance from pvp_test.wallet_accounts
          where owner_id = ${uid}::uuid and kind = 'user_available' and account_type = 'real'`
      )[0].balance,
    );
  }

  async function btc(uid: string, cents: number) {
    return err(
      sql`select pvp_test.btcpay_request_payout(${uid}::uuid, ${cents}::bigint, ${BTC}, ${quotedSats(cents)}::bigint, ${BTC_QUOTE_RATE}::bigint, ${quoteExpiry()}::timestamptz)`,
    );
  }

  async function usdc(uid: string, cents: number) {
    return err(
      sql`select pvp_test.crypto_request_withdrawal(${uid}::uuid, 8453::bigint, 'USDC', ${cents}::bigint, null::uuid, true, ${await walletOf(uid)})`,
    );
  }

  async function eth(uid: string, cents: number) {
    try {
      const quote = (
        await sql`select pvp_test.crypto_quote_withdrawal(${uid}::uuid, 8453::bigint, ${cents}::bigint) q`
      )[0].q as { quote_id: string };
      return err(
        sql`select pvp_test.crypto_request_withdrawal(${uid}::uuid, 8453::bigint, 'ETH', ${cents}::bigint, ${quote.quote_id}::uuid, true, ${await walletOf(uid)})`,
      );
    } catch (e) {
      return String((e as Error).message);
    }
  }

  it("rejects a cashout under $20 on bitcoin, usdc, and eth", async () => {
    const u = await user("min");
    await deposit(u, 5000);
    expect(await eth(u, 2000)).toMatch(/DEPOSIT_WAGER_REQUIRED/);
    await entry(u, 91010, 2500);
    await settle(91010, [{ uid: u, stake: 2500 }], u, 2500, 0);
    expect(await btc(u, 1000)).toMatch(/BELOW_MINIMUM/);
    expect(await usdc(u, 1000)).toMatch(/BELOW_MINIMUM/);
    expect(await eth(u, 1000)).toMatch(/BELOW_MINIMUM/);
    expect(await eth(u, 2000)).toBe("");
    expect(await bal(u)).toBe(3000);
  });

  it("keeps a promo stake as bonus when a depositor wins it", async () => {
    const depositor = await user("dep");
    const promo = await user("pro");
    const other = await user("oth");
    await deposit(depositor, 1900);
    await deposit(other, 2000);
    await bonus(promo, "promo_reward", 200);
    await entry(depositor, 91001, 100);
    await entry(promo, 91001, 200);
    await settle(
      91001,
      [
        { uid: depositor, stake: 100 },
        { uid: promo, stake: 200 },
      ],
      depositor,
      285,
      15,
    );
    await entry(depositor, 91003, 500);
    await entry(other, 91003, 500);
    await settle(
      91003,
      [
        { uid: depositor, stake: 500 },
        { uid: other, stake: 500 },
      ],
      depositor,
      950,
      50,
    );
    await entry(depositor, 91004, 350);
    await settle(91004, [{ uid: depositor, stake: 350 }], depositor, 350, 0);
    expect(await basis(depositor)).toMatchObject({
      deposits: 1900,
      eligible: 2345,
      bonus: 190,
      room: 2345,
    });
    expect(await basis(promo)).toMatchObject({ deposits: 0, eligible: 0, bonus: 0, room: 0 });
    expect(await btc(depositor, 2535)).toMatch(/BONUS_NOT_WITHDRAWABLE/);
    expect(await usdc(depositor, 2345)).toBe("");
    expect(await bal(depositor)).toBe(190);
  }, 60_000);

  it("lets bonus out only after $20 of deposits, and only the eligible part before that", async () => {
    const u = await user("mix");
    await deposit(u, 1500);
    await bonus(u, "promo_reward", 200);
    await bonus(u, "referral_reward", 300);
    await bonus(u, "leaderboard_prize", 400);
    expect(await basis(u)).toMatchObject({
      deposits: 1500,
      eligible: 1500,
      bonus: 900,
      room: 0,
    });
    expect(await btc(u, 2000)).toMatch(/BONUS_NOT_WITHDRAWABLE/);
    expect(await bal(u)).toBe(2400);
    await deposit(u, 500);
    expect(await basis(u)).toMatchObject({
      deposits: 2000,
      eligible: 2000,
      bonus: 900,
      room: 0,
    });
    expect(await btc(u, 2900)).toMatch(/DEPOSIT_WAGER_REQUIRED/);
    await entry(u, 91011, 1000);
    await settle(91011, [{ uid: u, stake: 1000 }], u, 1000, 0);
    expect(await basis(u)).toMatchObject({
      deposits: 2000,
      eligible: 2000,
      bonus: 900,
      room: 2900,
    });
    expect(await btc(u, 2900)).toBe("");
    expect(await bal(u)).toBe(0);
  });

  it("does not let two withdrawals spend the same eligible balance", async () => {
    const u = await user("race");
    await deposit(u, 2000);
    await bonus(u, "promo_reward", 500);
    await entry(u, 91012, 1000);
    await settle(91012, [{ uid: u, stake: 1000 }], u, 1000, 0);
    const results = await Promise.all([btc(u, 2000), usdc(u, 2000)]);
    expect(results.filter((m) => m === "").length, results.join(" | ")).toBe(1);
    expect(
      results.filter((m) => /BONUS_NOT_WITHDRAWABLE|WITHDRAWAL_PENDING|INSUFFICIENT/.test(m))
        .length,
      results.join(" | "),
    ).toBe(1);
    const locked = Number(
      (
        await sql`select coalesce(sum(balance), 0)::bigint b from pvp_test.wallet_accounts
          where owner_id = ${u}::uuid and kind = 'user_locked' and account_type = 'real'`
      )[0].b,
    );
    expect(await bal(u)).toBe(500);
    expect(locked).toBe(2000);
  });

  it("keeps a promo network redeemed after the claim is deleted", async () => {
    const admin = await user("adm");
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}::uuid, 'admin')`;
    const session = randomUUID();
    const device = randomUUID();
    await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
      values (${device}::uuid, ${admin}::uuid, ${randomBytes(32).toString("hex")}, clock_timestamp())`;
    await sql`insert into pvp_test.test_auth_sessions (id, user_id) values (${session}::uuid, ${admin}::uuid)`;
    await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
      values (${session}::uuid, ${admin}::uuid, ${device}::uuid)`;
    const claims = JSON.stringify({
      sub: admin,
      role: "authenticated",
      app_role: "admin",
      session_id: session,
    });
    const created = (
      await sql`select pvp_test.promo_admin_create('FLOOR20', 200::bigint, 5, null::timestamptz) r
        from (select set_config('test.uid', ${admin}, true), set_config('request.jwt.claims', ${claims}, true)) c`
    )[0].r as { ok: boolean };
    expect(created.ok).toBe(true);
    const first = await user("net");
    const claimed = (
      await sql`select pvp_test.promo_claim('FLOOR20') r
        from (select set_config('test.uid', ${first}, true), set_config('test.client_ip', '203.0.113.20', true)) c`
    )[0].r as { ok: boolean };
    expect(claimed.ok).toBe(true);
    await expect(
      sql`delete from pvp_test.promo_claims where user_id = ${first}::uuid`,
    ).rejects.toThrow(/IMMUTABLE/);
    await sql.begin(async (db) => {
      await db`alter table pvp_test.promo_claims disable trigger promo_claim_guard`;
      await db`delete from pvp_test.promo_claims where user_id = ${first}::uuid`;
      await db`alter table pvp_test.promo_claims enable trigger promo_claim_guard`;
      await db`delete from pvp_test.test_auth_users where id = ${first}::uuid`;
    });
    const [guard] = await sql`select tgenabled from pg_trigger
      where tgrelid = 'pvp_test.promo_claims'::regclass and tgname = 'promo_claim_guard'`;
    expect(guard.tgenabled).toBe("O");
    expect(
      (await sql`select 1 from pvp_test.promo_claims where user_id = ${first}::uuid`).length,
    ).toBe(0);
    expect(
      (await sql`select 1 from pvp_test.promo_ip_redemptions where ip = '203.0.113.20'::inet`)
        .length,
    ).toBe(1);
    const second = await user("net2");
    const again = (
      await sql`select pvp_test.promo_claim('FLOOR20') r
        from (select set_config('test.uid', ${second}, true), set_config('test.client_ip', '203.0.113.20', true)) c`
    )[0].r as { ok: boolean };
    expect(again.ok).toBe(false);
    expect(
      Number(
        (
          await sql`select count(*)::int n from pvp_test.ledger_transactions
            where user_id = ${second}::uuid and kind = 'promo_reward'`
        )[0].n,
      ),
    ).toBe(0);
  });

  it("replays an already posted promo wash as zero cash", async () => {
    const a = await user("old");
    const b = await user("old2");
    await bonus(a, "promo_reward", 1300);
    await bonus(b, "promo_reward", 1300);
    const game = 91002;
    await entry(a, game, 1300);
    await entry(b, game, 1300);
    await settle(
      game,
      [
        { uid: a, stake: 1300 },
        { uid: b, stake: 1300 },
      ],
      a,
      2470,
      130,
    );
    expect(await basis(a)).toMatchObject({ deposits: 0, eligible: 0, room: 0 });
    expect(await basis(b)).toMatchObject({ deposits: 0, eligible: 0, room: 0 });
    expect(await btc(a, 2000)).toMatch(/BONUS_NOT_WITHDRAWABLE/);
    expect(await usdc(a, 2000)).toMatch(/BONUS_NOT_WITHDRAWABLE/);
    expect(await eth(a, 2000)).toMatch(/BONUS_NOT_WITHDRAWABLE/);
    await assertBasisParity();
  });

  it("cached withdraw basis matches full replay after bonus scenarios", async () => {
    await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
  });
});
