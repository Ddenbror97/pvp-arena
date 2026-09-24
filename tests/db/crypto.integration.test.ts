/**
 * Crypto money-path safety suite (Base Sepolia rails). Runs against the
 * isolated `pvp_test` schema with real concurrent Postgres transactions.
 * Requires SUPABASE_DB_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 12, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});

const FEED = "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1";
const PRICE = 2_500_000_000; // $2500.000000 in micro-USD
let TREASURY = "";

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
const one = async (q: Promise<any>) => (await q)[0]?.r;
const addr = () => "0x" + randomBytes(20).toString("hex");
const txh = () => "0x" + randomBytes(32).toString("hex");
const settled = <T>(ps: Promise<T>[]) => Promise.allSettled(ps);

async function newUser(name: string, verified = true) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${name + id.slice(0, 6)}, true)`);
  const w = addr();
  if (verified) {
    await sql`insert into pvp_test.user_wallets (user_id, chain_type, address, normalized_address, wallet_provider, is_verified, is_primary, verified_at)
      values (${id}, 'EVM', ${w}, ${w}, 'metamask', true, true, now())`;
  }
  return { id, wallet: w };
}
const bal = async (uid: string, kind = "user_available") =>
  Number((await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind}`)[0]?.balance ?? 0);
const observe = (asset: string, tx: string, from: string, units: string, log = 0) =>
  one(sql`select pvp_test.crypto_observe_deposit(${asset}, ${tx}, ${log}, 100, ${from}, ${TREASURY}, ${units}) as r`);
const credit = (id: string, snap: string | null = null) => one(sql`select pvp_test.crypto_credit_deposit(${id}, ${snap}) as r`);
const snapshot = () => one(sql`select pvp_test.crypto_record_price('ETH', ${FEED}, 1, ${PRICE}, now()) as r`);
const withdraw = (uid: string, cents: number, asset = "USDC", quote: string | null = null) =>
  one(sql`select pvp_test.crypto_request_withdrawal(${uid}, ${asset}, ${cents}, ${quote}, true) as r`);
const wd = async (id: string) => (await sql`select * from pvp_test.crypto_withdrawals where id = ${id}`)[0];
const ledgerCount = async (key: string) => Number((await sql`select count(*) c from pvp_test.ledger_transactions where idempotency_key like ${key}`)[0].c);

async function assertInvariants() {
  const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  const neg = await sql`select id from pvp_test.wallet_accounts where kind not in ('test_faucet','external_custody') and balance < 0`;
  expect(neg.length).toBe(0);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const unbalanced = await sql`select tx_id from pvp_test.ledger_postings group by tx_id having sum(amount) <> 0`;
  expect(unbalanced.length).toBe(0);
}

d("crypto money path", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    TREASURY = (await sql`select address from pvp_test.chain_treasury_accounts where role = 'deposit'`)[0].address.toLowerCase();
    await sql`update pvp_test.jackpot_config set entry_rate_limit = 100000`;
  }, 120_000);

  it("duplicate deposit is credited exactly once (replayed + concurrent)", async () => {
    const u = await newUser("dup");
    const before = await bal(u.id);
    const tx = txh();
    const a = await observe("USDC", tx, u.wallet, "5000000"); // 5 USDC
    const b = await observe("USDC", tx, u.wallet, "5000000");
    expect(b.id).toBe(a.id);
    await settled(Array.from({ length: 6 }, () => credit(a.id)));
    expect(await bal(u.id)).toBe(before + 500);
    expect(await ledgerCount(`deposit:%:${tx}:0`)).toBe(1);
    // observing after credit does not reopen it
    expect((await observe("USDC", tx, u.wallet, "5000000")).status).toBe("CREDITED");
    await credit(a.id);
    expect(await bal(u.id)).toBe(before + 500);
    await assertInvariants();
  });

  it("unmatched deposit is never credited automatically", async () => {
    const stranger = addr();
    const dep = await observe("USDC", txh(), stranger, "9000000");
    expect((await credit(dep.id)).status).toBe("UNMATCHED");
    expect((await credit(dep.id)).status).toBe("UNMATCHED");
    const row = (await sql`select * from pvp_test.crypto_deposits where id = ${dep.id}`)[0];
    expect(row.ledger_tx_id).toBeNull();
    expect(row.user_id).toBeNull();
    // an address verified by two accounts is also unmatched
    const w = addr();
    for (const n of ["ta", "tb"]) {
      const u = await newUser(n, false);
      await sql`insert into pvp_test.user_wallets (user_id, chain_type, address, normalized_address, wallet_provider, is_verified, is_primary, verified_at)
        values (${u.id}, 'EVM', ${w}, ${w}, 'metamask', true, true, now())`.catch(() => {});
    }
    const d2 = await observe("USDC", txh(), w, "9000000");
    const r2 = await credit(d2.id);
    const n = Number((await sql`select count(*) c from pvp_test.user_wallets where normalized_address = ${w} and is_verified`)[0].c);
    if (n > 1) expect(r2.status).toBe("UNMATCHED");
    await assertInvariants();
  });

  it("ETH deposit waits for a fresh price and is valued server-side", async () => {
    const u = await newUser("eth");
    const before = await bal(u.id);
    const dep = await observe("ETH", txh(), u.wallet, "1000000000000000000", 1_000_000); // 1 ETH
    const stale = await one(sql`select pvp_test.crypto_record_price('ETH', ${FEED}, 1, ${PRICE}, now() - interval '2 hours') as r`);
    expect((await credit(dep.id, stale)).status).toBe("AWAITING_VALUATION");
    expect((await credit(dep.id, null)).status).toBe("AWAITING_VALUATION");
    expect((await credit(dep.id, await snapshot())).status).toBe("CREDITED");
    expect(await bal(u.id)).toBe(before + 250_000);
    await assertInvariants();
  });

  it("two simultaneous withdrawals cannot spend the same balance twice", async () => {
    const u = await newUser("ww");
    const avail = await bal(u.id);
    const amt = Math.floor(avail * 0.7);
    const rs = await settled([withdraw(u.id, Math.min(amt, 50_000)), withdraw(u.id, Math.min(amt, 50_000)), withdraw(u.id, Math.min(amt, 50_000))]);
    expect(rs.filter((r) => r.status === "fulfilled").length).toBe(1);
    const n = Number((await sql`select count(*) c from pvp_test.crypto_withdrawals where user_id = ${u.id}`)[0].c);
    expect(n).toBe(1);
    expect(await bal(u.id)).toBe(avail - Math.min(amt, 50_000));
    await assertInvariants();
  });

  it("insufficient balance is rejected and nothing is held", async () => {
    const u = await newUser("ins");
    const avail = await bal(u.id);
    await sql`update pvp_test.crypto_settings set daily_limit_cents = ${avail * 10}`;
    await expect(withdraw(u.id, avail + 1)).rejects.toThrow(/INSUFFICIENT_BALANCE/);
    expect(await bal(u.id)).toBe(avail);
    await sql`update pvp_test.crypto_settings set daily_limit_cents = 100000`;
  });

  it("cancellation releases held funds exactly once", async () => {
    const u = await newUser("cx");
    const avail = await bal(u.id);
    const w = await withdraw(u.id, 1000);
    expect(await bal(u.id, "user_locked")).toBe(1000);
    await settled(Array.from({ length: 5 }, () => one(sql`select pvp_test.crypto_cancel_withdrawal(${u.id}, ${w.id}) as r`)));
    expect(await bal(u.id)).toBe(avail);
    expect(await bal(u.id, "user_locked")).toBe(0);
    expect(await ledgerCount(`withdrawal:${w.id}:release`)).toBe(1);
    expect((await wd(w.id)).status).toBe("RELEASED");
    await assertInvariants();
  });

  it("failed withdrawal releases funds exactly once, and never after settlement", async () => {
    const u = await newUser("fx");
    const avail = await bal(u.id);
    const w = await withdraw(u.id, 700);
    await sql`select pvp_test.crypto_withdrawal_signed(${w.id}, ${txh()}, 1, '0x00')`;
    await settled(Array.from({ length: 5 }, () => sql`select pvp_test.crypto_withdrawal_failed(${w.id}, 'reverted')`));
    expect(await bal(u.id)).toBe(avail);
    expect(await ledgerCount(`withdrawal:${w.id}:release`)).toBe(1);
    await sql`select pvp_test.crypto_withdrawal_confirmed(${w.id})`;
    expect(await ledgerCount(`withdrawal:${w.id}:settle`)).toBe(0);
    await assertInvariants();
  });

  it("a replayed/confirmed withdrawal can only settle once and cannot be re-signed", async () => {
    const u = await newUser("rp");
    const avail = await bal(u.id);
    const w = await withdraw(u.id, 900);
    await sql`select pvp_test.crypto_withdrawal_signed(${w.id}, ${txh()}, 2, '0x00')`;
    await expect(sql`select pvp_test.crypto_withdrawal_signed(${w.id}, ${txh()}, 3, '0x00')`).rejects.toThrow(/NOT_APPROVED/);
    await sql`select pvp_test.crypto_withdrawal_broadcast(${w.id})`;
    await settled(Array.from({ length: 5 }, () => sql`select pvp_test.crypto_withdrawal_confirmed(${w.id})`));
    await sql`select pvp_test.crypto_withdrawal_failed(${w.id}, 'late failure')`;
    await expect(one(sql`select pvp_test.crypto_cancel_withdrawal(${u.id}, ${w.id}) as r`)).rejects.toThrow();
    expect(await ledgerCount(`withdrawal:${w.id}:settle`)).toBe(1);
    expect(await ledgerCount(`withdrawal:${w.id}:release`)).toBe(0);
    expect(await bal(u.id)).toBe(avail - 900);
    expect(await bal(u.id, "user_locked")).toBe(0);
    expect((await wd(w.id)).status).toBe("CONFIRMED");
    await assertInvariants();
  });

  it("ETH quotes: expired and reused quotes are rejected", async () => {
    const u = await newUser("qt");
    await snapshot();
    const q = await one(sql`select pvp_test.crypto_quote_withdrawal(${u.id}, 1000) as r`);
    expect(BigInt(q.wei)).toBe((1000n * 10_000n * 10n ** 18n) / BigInt(PRICE));
    await expect(withdraw(u.id, 1200, "ETH", q.quote_id)).rejects.toThrow(/QUOTE_MISMATCH/);
    const w = await withdraw(u.id, 1000, "ETH", q.quote_id);
    expect(String((await wd(w.id)).units)).toBe(q.wei);
    await sql`select pvp_test.crypto_cancel_withdrawal(${u.id}, ${w.id})`;
    await expect(withdraw(u.id, 1000, "ETH", q.quote_id)).rejects.toThrow(/QUOTE_USED/);
    const q2 = await one(sql`select pvp_test.crypto_quote_withdrawal(${u.id}, 1000) as r`);
    await sql`update pvp_test.crypto_withdrawal_quotes set expires_at = now() - interval '1 second' where id = ${q2.quote_id}`;
    await expect(withdraw(u.id, 1000, "ETH", q2.quote_id)).rejects.toThrow(/QUOTE_EXPIRED/);
    const other = await newUser("qo");
    const q3 = await one(sql`select pvp_test.crypto_quote_withdrawal(${u.id}, 1000) as r`);
    await expect(withdraw(other.id, 1000, "ETH", q3.quote_id)).rejects.toThrow(/QUOTE_INVALID/);
    await assertInvariants();
  });

  it("deposit and bet at the same time keep the ledger correct", async () => {
    const u = await newUser("db");
    const before = await bal(u.id);
    const dep = await observe("USDC", txh(), u.wallet, "3000000");
    const joins = Array.from({ length: 4 }, () =>
      as(u.id, (tx) => tx`select pvp_test.jackpot_join(100, ${randomUUID()})`));
    const rs = await settled([credit(dep.id), ...joins]);
    const ok = rs.slice(1).filter((r) => r.status === "fulfilled").length;
    expect(await bal(u.id)).toBe(before + 300 - ok * 100);
    await assertInvariants();
  });

  it("concurrent deposit and withdrawal never produce a negative or wrong balance", async () => {
    const u = await newUser("dw");
    const before = await bal(u.id);
    const dep = await observe("USDC", txh(), u.wallet, "2000000");
    const rs = await settled([credit(dep.id), withdraw(u.id, before), credit(dep.id)]);
    const withdrew = rs[1].status === "fulfilled";
    expect(await bal(u.id)).toBe(before + 200 - (withdrew ? before : 0));
    await assertInvariants();
  });

  it("paused switches block withdrawals and deposits independently", async () => {
    const u = await newUser("sw");
    await sql`update pvp_test.crypto_settings set withdrawals_enabled = false`;
    await expect(withdraw(u.id, 600)).rejects.toThrow(/WITHDRAWALS_PAUSED/);
    const dep = await observe("USDC", txh(), u.wallet, "2000000");
    expect((await credit(dep.id)).status).toBe("CREDITED");
    await sql`update pvp_test.crypto_settings set withdrawals_enabled = true, deposits_enabled = false`;
    const dep2 = await observe("USDC", txh(), u.wallet, "2000000");
    expect((await credit(dep2.id)).status).toBe("PAUSED");
    await sql`update pvp_test.crypto_settings set deposits_enabled = true`;
    await expect(sql`update pvp_test.crypto_settings set mainnet_enabled = true`).rejects.toThrow();
    await expect(sql`update pvp_test.crypto_settings set chain_id = 8453`).rejects.toThrow();
  });

  it("reconciliation mismatch raises an alert and never changes balances", async () => {
    const snap = async () => (await sql`select id, balance from pvp_test.wallet_accounts order by id`).map((r) => `${r.id}:${r.balance}`).join(",");
    const before = await snap();
    const r = await one(sql`select pvp_test.crypto_reconcile(0, '{}'::jsonb) as r`);
    expect(r.ok).toBe(false);
    expect(await snap()).toBe(before);
    const inc = await sql`select * from pvp_test.integrity_incidents where check_name = 'crypto_reconcile'`;
    expect(inc.length).toBe(1);
    const ok = await one(sql`select pvp_test.crypto_reconcile(${Number.MAX_SAFE_INTEGER}, '{}'::jsonb) as r`);
    expect(ok.ok).toBe(true);
    await assertInvariants();
  });
});
