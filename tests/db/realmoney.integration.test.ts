/**
 * Real-money ledger migration suite (real_usd_v1). Runs against the isolated
 * `pvp_test` schema built from every production migration. Requires SUPABASE_DB_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { seedSnapshotDeposits, SNAPSHOT_TX } from "./money";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 12, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const addr = () => "0x" + randomBytes(20).toString("hex");
const txh = () => "0x" + randomBytes(32).toString("hex");
const one = async (q: Promise<any>) => (await q)[0]?.r;
const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "";
  } catch (e) {
    return String((e as Error).message);
  }
};
let TREASURY = "";
let n = 0;

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
const state = async () => (await sql`select pvp_test._money_state() r`)[0].r as string;
const observe = (from: string, units: string, tx = txh()) =>
  one(sql`select pvp_test.crypto_observe_deposit(84532, 'USDC', ${tx}, 0, 100, ${from}, ${TREASURY}, ${units}) as r`);
const credit = (id: string) => one(sql`select pvp_test.crypto_credit_deposit(${id}, null) as r`);
const bal = async (uid: string, kind = "user_available", type = "real") =>
  Number((await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = ${type}`)[0]?.balance ?? 0);
const sys = async (kind: string) =>
  Number((await sql`select coalesce(sum(balance),0)::bigint b from pvp_test.wallet_accounts where owner_id is null and kind = ${kind} and account_type = 'real'`)[0].b);

async function newUser(fund = 0) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${"rm" + Date.now().toString(36) + n++}, true)`);
  const w = addr();
  await sql`insert into pvp_test.user_wallets (user_id, chain_type, address, normalized_address, wallet_provider, is_verified, is_primary, verified_at)
    values (${id}, 'EVM', ${w}, ${w}, 'metamask', true, true, now())`;
  if (fund) {
    const dep = await observe(w, String(fund * 10_000));
    expect((await credit(dep.id)).status).toBe("CREDITED");
  }
  return { id, wallet: w };
}

async function realInvariants() {
  const inv = (await sql`select pvp_test.money_real_invariants() r`)[0].r;
  expect(inv.ok_postings_zero).toBe(true);
  expect(inv.ok_custody_equals_liabilities).toBe(true);
  expect(inv.ok_custody_equals_flows).toBe(true);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const neg = await sql`select id from pvp_test.wallet_accounts where kind not in ('test_faucet','external_custody','house_bankroll') and balance < 0`;
  expect(neg.length).toBe(0);
  // Every transaction stays inside one money domain.
  const mixed = await sql`select p.tx_id from pvp_test.ledger_postings p join pvp_test.wallet_accounts w on w.id = p.account_id
    group by p.tx_id having count(distinct w.account_type) > 1`;
  expect(mixed.length).toBe(0);
  return inv;
}

d("real-money ledger migration", () => {
  let testUser = "";
  let testBefore = "";

  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    TREASURY = (await sql`select address from pvp_test.chain_treasury_accounts where role = 'deposit' and chain_id = 84532`)[0].address.toLowerCase();
    await sql`update pvp_test.jackpot_config set entry_rate_limit = 100000, countdown_seconds = 1`;
    await sql`update pvp_test.coinflip_config set pre_delay_ms = 50, animation_ms = 50, create_rate_limit = 100000, fee_bps = 500`;
    await sql`update pvp_test.crypto_settings set watch_only = true, withdrawals_enabled = false, real_play_enabled = false, daily_limit_cents = 10000000, daily_global_limit_cents = 100000000, auto_approve_cents = 10000000`;
    // A pre-migration player with test credits, and the two snapshot deposits.
    testUser = randomUUID();
    await as(testUser, (tx) => tx`select pvp_test.ensure_profile(${"pre" + Date.now().toString(36)}, true)`);
    await seedSnapshotDeposits(sql);
    testBefore = JSON.stringify(await sql`select id, balance from pvp_test.wallet_accounts where account_type = 'test_credit' order by id`);
  }, 180_000);

  it("before migration: real ledger refuses postings, credits and withdrawals", async () => {
    expect(await state()).toBe("PRE_MIGRATION");
    const u = await newUser();
    const dep = await observe(u.wallet, "5000000");
    await sql`update pvp_test.crypto_settings set watch_only = false`;
    // Sepolia rail is test money here; real crediting still refuses before FINALIZED.
    expect((await credit(dep.id)).status).toBe("LEDGER_NOT_READY");
    await sql`update pvp_test.crypto_settings set watch_only = true`;
    expect(await err(sql`select pvp_test.crypto_request_withdrawal(${u.id}, 84532, 'USDC', 1000, null, true)`)).toMatch(/LEDGER_NOT_READY/);
    expect(await bal(u.id)).toBe(0);
  });

  it("the domain guard rejects mixing test and real money, on every path", async () => {
    const [tAcc] = await sql`select id from pvp_test.wallet_accounts where owner_id = ${testUser} and kind = 'user_available' and account_type = 'test_credit'`;
    const [rAcc] = await sql`select id from pvp_test.wallet_accounts where owner_id = ${testUser} and kind = 'user_available' and account_type = 'real'`;
    expect(rAcc).toBeTruthy();
    const tryTx = (type: string, kind: string, acct: string) =>
      err(sql.begin(async (tx) => {
        const [t] = await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type) values (${kind}::pvp_test.tx_kind, ${randomUUID()}, ${type}) returning id`;
        await tx`select pvp_test._post(${t.id}, ${acct}, 1)`;
        await tx`select pvp_test._post(${t.id}, ${acct}, -1)`;
      }));
    expect(await tryTx("real", "refund", tAcc.id)).toMatch(/LEDGER_DOMAIN_MIX/);
    expect(await tryTx("test_credit", "refund", rAcc.id)).toMatch(/LEDGER_DOMAIN_MIX/);
    expect(await tryTx("test_credit", "deposit", tAcc.id)).toMatch(/LEDGER_DOMAIN_MIX/);
    expect(await tryTx("real", "refund", rAcc.id)).toMatch(/LEDGER_NOT_READY/);
    // Account asset/type must pair.
    expect(await err(sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type) values (null, 'house_revenue', 'TEST_USD', 'real')`)).toMatch(/domain_pair|violates/);
    expect(await err(sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type) values (null, 'test_faucet', 'USD', 'real')`)).toMatch(/violates/);
  });

  it("migration: preconditions fail closed without changing anything", async () => {
    await sql`update pvp_test.crypto_settings set withdrawals_enabled = true`;
    expect(await err(sql`select pvp_test._money_migrate_v1()`)).toMatch(/PRECONDITION switches/);
    await sql`update pvp_test.crypto_settings set withdrawals_enabled = false`;
    expect(await state()).toBe("PRE_MIGRATION");
    expect((await sql`select account_type from pvp_test.money_domain_config`)[0].account_type).toBe("test_credit");
  });

  it("migration: applies once, creates $0 real accounts, keeps test balances and deposits untouched; rollback works", async () => {
    // Open empty test rounds are closed by the migration.
    await sql`select pvp_test._ensure_open_game()`;
    const snapBefore = (await sql`select pvp_test._money_deposit_snapshot() r`)[0].r;
    const r1 = (await sql`select pvp_test._money_migrate_v1() r`)[0].r;
    expect(r1.status).toBe("MIGRATED");
    expect(r1.cancelled.some((c: any) => c.game === "jackpot")).toBe(true);
    expect((await sql`select pvp_test._money_migrate_v1() r`)[0].r.status).toBe("ALREADY_APPLIED");
    expect(await state()).toBe("MIGRATED");
    const noReal = await sql`select p.id from pvp_test.profiles p where not exists (select 1 from pvp_test.wallet_accounts w where w.owner_id = p.id and w.account_type = 'real' and w.kind = 'user_locked')`;
    expect(noReal.length).toBe(0);
    expect(Number((await sql`select coalesce(sum(abs(balance)),0)::bigint s from pvp_test.wallet_accounts where account_type = 'real'`)[0].s)).toBe(0);
    expect(JSON.stringify(await sql`select id, balance from pvp_test.wallet_accounts where account_type = 'test_credit' order by id`)).toBe(testBefore);
    expect((await sql`select pvp_test._money_deposit_snapshot() r`)[0].r).toEqual(snapBefore);
    for (const tx of SNAPSHOT_TX) {
      const [dep] = await sql`select status, ledger_tx_id from pvp_test.crypto_deposits where tx_hash = ${tx}`;
      expect(dep).toMatchObject({ status: "CONFIRMED", ledger_tx_id: null });
    }
    // No test play and no real play in MIGRATED.
    expect(await err(as(testUser, (tx) => tx`select pvp_test.jackpot_join(100, ${randomUUID()})`))).toMatch(/REAL_MONEY_DISABLED/);
    expect(await err(sql`select pvp_test.claim_test_credits()`)).toMatch(/TEST_CREDITS_RETIRED/);
    // Rollback returns to PRE_MIGRATION, then re-migrate.
    expect((await sql`select pvp_test._money_rollback_v1() r`)[0].r.status).toBe("ROLLED_BACK");
    expect(await state()).toBe("PRE_MIGRATION");
    expect((await sql`select pvp_test._money_migrate_v1() r`)[0].r.status).toBe("MIGRATED");
    await realInvariants();
  });

  it("finalize: freezes test money; real play needs every gate", async () => {
    expect((await sql`select pvp_test._money_finalize_v1() r`)[0].r.status).toBe("FINALIZED");
    expect((await sql`select pvp_test._money_finalize_v1() r`)[0].r.status).toBe("ALREADY_FINALIZED");
    expect(await err(sql`select pvp_test._money_rollback_v1()`)).toMatch(/ROLLBACK only allowed/);
    // Test domain is frozen: any test posting fails.
    const [tAcc] = await sql`select id from pvp_test.wallet_accounts where owner_id = ${testUser} and kind = 'user_available' and account_type = 'test_credit'`;
    expect(await err(sql.begin(async (tx) => {
      const [t] = await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type) values ('refund', ${randomUUID()}, 'test_credit') returning id`;
      await tx`select pvp_test._post(${t.id}, ${tAcc.id}, 0)`;
    }))).toMatch(/TEST_DOMAIN_FROZEN/);
    // Gate: real_play_enabled alone is not enough without crypto_system_enabled; and vice versa.
    const u = await newUser();
    expect(await err(as(u.id, (tx) => tx`select pvp_test.coinflip_create(100, 'HEADS', ${randomUUID()})`))).toMatch(/REAL_MONEY_DISABLED/);
    await sql`update pvp_test.crypto_settings set real_play_enabled = true, crypto_system_enabled = false`;
    expect(await err(as(u.id, (tx) => tx`select pvp_test.coinflip_create(100, 'HEADS', ${randomUUID()})`))).toMatch(/REAL_MONEY_DISABLED/);
    await sql`update pvp_test.crypto_settings set crypto_system_enabled = true`;
    // Repoint the Sepolia rail at the real ledger for the rest of this test schema.
    await sql.unsafe(`alter table pvp_test.chain_assets disable trigger user;
      update pvp_test.chain_assets set ledger_asset = 'USD', ledger_account_type = 'real' where chain_id = 84532;
      alter table pvp_test.chain_assets enable trigger user;`);
    await sql`update pvp_test.crypto_settings set watch_only = false, withdrawals_enabled = true`;
  });

  it("deposits: credit exactly once, even concurrently; unverified senders never credit", async () => {
    const u = await newUser();
    const tx = txh();
    const dep = await observe(u.wallet, "5000000", tx);
    await Promise.allSettled(Array.from({ length: 8 }, () => credit(dep.id)));
    expect(await bal(u.id)).toBe(500);
    expect(Number((await sql`select count(*) c from pvp_test.ledger_transactions where idempotency_key like ${"deposit:%:" + tx + ":0"}`)[0].c)).toBe(1);
    const stranger = await observe(addr(), "5000000");
    expect((await credit(stranger.id)).status).toBe("UNMATCHED");
    const small = await observe(u.wallet, "100");
    expect((await credit(small.id)).status).toBe("REJECTED");
    expect(await bal(u.id)).toBe(500);
    await realInvariants();
  });

  it("ledger: concurrent spend cannot overdraw; insufficient balance rejected", async () => {
    const u = await newUser(10); // $10
    const rs = await Promise.allSettled(Array.from({ length: 6 }, () => as(u.id, (tx) => tx`select pvp_test.jackpot_join(400, ${randomUUID()})`)));
    const ok = rs.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(2);
    expect(await bal(u.id)).toBe(200);
    expect(await bal(u.id, "user_locked")).toBe(800);
    expect(await err(as(u.id, (tx) => tx`select pvp_test.jackpot_join(300, ${randomUUID()})`))).toMatch(/INSUFFICIENT_BALANCE/);
    await realInvariants();
  });

  it("jackpot on real USD: one settlement, exact payout + rake, duplicate settle is a no-op", async () => {
    const g0 = (await sql`select id from pvp_test.jackpot_games where status in ('WAITING','ACTIVE') and account_type = 'real'`)[0];
    const a = await newUser(20);
    const b = await newUser(20);
    const key = randomUUID();
    await as(a.id, (tx) => tx`select pvp_test.jackpot_join(1000, ${key})`);
    await as(a.id, (tx) => tx`select pvp_test.jackpot_join(1000, ${key})`); // same key = same entry
    await as(b.id, (tx) => tx`select pvp_test.jackpot_join(1000, ${randomUUID()})`);
    const [g] = await sql`select * from pvp_test.jackpot_games where status = 'ACTIVE' and account_type = 'real'`;
    expect(g.money_domain).toBe("REAL_USD");
    await sleep(Math.max(0, +g.scheduled_end_at - Date.now()) + 200);
    const houseBefore = await sys("house_revenue");
    await Promise.allSettled(Array.from({ length: 4 }, () => sql`select pvp_test.jackpot_settle(${g.id})`));
    const [done] = await sql`select * from pvp_test.jackpot_games where id = ${g.id}`;
    expect(done.status).toBe("COMPLETED");
    const pot = Number(done.pot_amount);
    expect(pot + Number(g0 ? 0 : 0)).toBeGreaterThanOrEqual(2000);
    expect(Number(done.payout_amount) + Number(done.rake_amount)).toBe(pot);
    expect(Number(done.rake_amount)).toBe(Math.floor((pot * done.rake_bps) / 10000));
    expect(await sys("house_revenue")).toBe(houseBefore + Number(done.rake_amount));
    expect(Number((await sql`select count(*) c from pvp_test.ledger_transactions where game_id = ${g.id} and kind = 'jackpot_settlement'`)[0].c)).toBe(1);
    const total = (await bal(a.id)) + (await bal(b.id)) + (await bal(a.id, "user_locked")) + (await bal(b.id, "user_locked"));
    expect(total).toBe(4000 - Number(done.rake_amount));
    await realInvariants();
  });

  it("coinflip on real USD: lock, one settlement, exact 5% fee", async () => {
    const a = await newUser(20);
    const b = await newUser(20);
    const c = (await as(a.id, (tx) => tx`select pvp_test.coinflip_create(1000, 'HEADS', ${randomUUID()}) r`))[0].r;
    expect(await bal(a.id, "user_locked")).toBe(1000);
    const joinKey = randomUUID();
    await Promise.allSettled([1, 2, 3].map(() => as(b.id, (tx) => tx`select pvp_test.coinflip_join(${c.game_id}, ${joinKey})`)));
    expect(await bal(b.id, "user_locked")).toBe(1000);
    const houseBefore = await sys("house_revenue");
    for (let i = 0; i < 40; i++) {
      await Promise.allSettled([sql`select pvp_test.coinflip_advance(${c.game_id})`, sql`select pvp_test.coinflip_advance(${c.game_id})`]);
      const [g] = await sql`select status from pvp_test.coinflip_games where id = ${c.game_id}`;
      if (g.status === "COMPLETED") break;
      await sleep(60);
    }
    const [g] = await sql`select * from pvp_test.coinflip_games where id = ${c.game_id}`;
    expect(g.status).toBe("COMPLETED");
    expect(g.money_domain).toBe("REAL_USD");
    expect(Number(g.fee_amount)).toBe(100);
    expect(Number(g.payout_amount)).toBe(1900);
    expect(await sys("house_revenue")).toBe(houseBefore + 100);
    const win = g.winner_id === a.id ? a.id : b.id;
    const lose = win === a.id ? b.id : a.id;
    expect(await bal(win)).toBe(1000 + 1900);
    expect(await bal(lose)).toBe(1000);
    expect(Number((await sql`select count(*) c from pvp_test.coinflip_payouts where game_id = ${c.game_id}`)[0].c)).toBe(1);
    await realInvariants();
  });

  it("roulette on real USD: limits enforced; wins paid from the house bankroll exactly once", async () => {
    await sql`update pvp_test.roulette_config set betting_seconds = 2, lock_ms = 100, spin_ms = 100`;
    const u = await newUser(50);
    const gid = (await sql`select pvp_test._roulette_ensure_open() r`)[0].r;
    const [g0] = await sql`select * from pvp_test.roulette_games where id = ${gid}`;
    expect(g0.money_domain).toBe("REAL_USD");
    await sleep(Math.max(0, +g0.betting_started_at - Date.now()) + 50);
    expect(await err(as(u.id, (tx) => tx`select pvp_test.roulette_bet(${Number(g0.max_bet) + 1}, 'RED', ${randomUUID()})`))).toMatch(/ABOVE_MAX_WAGER|INSUFFICIENT/);
    const colors = ["RED", "BLACK", "GREEN"];
    for (const col of colors) await as(u.id, (tx) => tx`select pvp_test.roulette_bet(100, ${col}::pvp_test.roulette_color, ${randomUUID()})`).catch(() => {});
    const placed = Number((await sql`select count(*) c from pvp_test.roulette_bets where game_id = ${gid}`)[0].c);
    expect(placed).toBeGreaterThan(0);
    expect(await bal(u.id, "user_locked")).toBe(placed * 100);
    const [g1] = await sql`select * from pvp_test.roulette_games where id = ${gid}`;
    await sleep(Math.max(0, +g1.betting_ends_at - Date.now()) + 50);
    expect(await err(as(u.id, (tx) => tx`select pvp_test.roulette_bet(100, 'RED', ${randomUUID()})`))).not.toBe("");
    for (let i = 0; i < 40; i++) {
      await Promise.allSettled([sql`select pvp_test.roulette_advance(${gid})`, sql`select pvp_test.roulette_advance(${gid})`]);
      const [g] = await sql`select status from pvp_test.roulette_games where id = ${gid}`;
      if (g.status === "COMPLETED") break;
      await sleep(80);
    }
    const [g] = await sql`select * from pvp_test.roulette_games where id = ${gid}`;
    expect(g.status).toBe("COMPLETED");
    const payouts = Number(g.total_payout);
    expect(await bal(u.id, "user_locked")).toBe(0);
    expect(await bal(u.id)).toBe(5000 - placed * 100 + payouts);
    expect(Number((await sql`select count(*) c from pvp_test.ledger_transactions where game_id = ${gid} and kind = 'roulette_settlement'`)[0].c)).toBe(placed);
    const faucet = await sql`select id from pvp_test.wallet_accounts where kind = 'test_faucet' and account_type = 'real'`;
    expect(faucet.length).toBe(0);
    await realInvariants();
  });

  it("withdrawals: hold once, insufficient/locked funds rejected, failure releases once, success settles once", async () => {
    const u = await newUser(30);
    await sql`update pvp_test.crypto_settings set withdrawal_fee_cents = 0`;
    expect(await err(sql`select pvp_test.crypto_request_withdrawal(${u.id}, 84532, 'USDC', 3001, null, true)`)).toMatch(/INSUFFICIENT_BALANCE/);
    const w = (await sql`select pvp_test.crypto_request_withdrawal(${u.id}, 84532, 'USDC', 1000, null, true) r`)[0].r;
    expect(await err(sql`select pvp_test.crypto_request_withdrawal(${u.id}, 84532, 'USDC', 1000, null, true)`)).toMatch(/WITHDRAWAL_PENDING/);
    expect(await bal(u.id)).toBe(2000);
    expect(await bal(u.id, "user_locked")).toBe(1000);
    await sql`select pvp_test.crypto_withdrawal_signed(${w.id}, ${txh()}, 1, '0x00')`;
    await Promise.allSettled(Array.from({ length: 4 }, () => sql`select pvp_test.crypto_withdrawal_failed(${w.id}, 'reverted')`));
    expect(await bal(u.id)).toBe(3000);
    const w2 = (await sql`select pvp_test.crypto_request_withdrawal(${u.id}, 84532, 'USDC', 1500, null, true) r`)[0].r;
    await sql`select pvp_test.crypto_withdrawal_signed(${w2.id}, ${txh()}, 2, '0x00')`;
    await sql`select pvp_test.crypto_withdrawal_broadcast(${w2.id})`;
    await Promise.allSettled(Array.from({ length: 4 }, () => sql`select pvp_test.crypto_withdrawal_confirmed(${w2.id})`));
    expect(await bal(u.id)).toBe(1500);
    expect(await bal(u.id, "user_locked")).toBe(0);
    expect(Number((await sql`select count(*) c from pvp_test.ledger_transactions where idempotency_key = ${"withdrawal:" + w2.id + ":settle"}`)[0].c)).toBe(1);
    await sql`update pvp_test.crypto_settings set crypto_system_enabled = false`;
    expect(await err(sql`select pvp_test.crypto_request_withdrawal(${u.id}, 84532, 'USDC', 600, null, true)`)).toMatch(/WITHDRAWALS_PAUSED/);
    await sql`update pvp_test.crypto_settings set crypto_system_enabled = true`;
    await realInvariants();
  });

  it("reconciliation: all three real-money equations hold and test money is excluded", async () => {
    const inv = await realInvariants();
    expect(Number(inv.credited_deposits)).toBeGreaterThan(0);
    const r = await one(sql`select pvp_test.crypto_reconcile(${Number.MAX_SAFE_INTEGER}, '{}'::jsonb) as r`);
    expect(r.ok).toBe(true);
    expect(r.invariants.ok_custody_equals_flows).toBe(true);
  });

  it("game rows cannot change money domain after creation", async () => {
    const [g] = await sql`select id from pvp_test.jackpot_games where status in ('WAITING','ACTIVE') limit 1`;
    if (g) expect(await err(sql`update pvp_test.jackpot_games set money_domain = 'TEST_USD', asset = 'TEST_USD', account_type = 'test_credit' where id = ${g.id}`)).toMatch(/IMMUTABLE_FIELD/);
  });
});
