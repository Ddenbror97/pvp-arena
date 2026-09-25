/**
 * Withdrawal payout finality: safe block + two independent providers must agree
 * before a withdrawal is settled (CONFIRMED) or refunded (RELEASED).
 *
 * Uses the production decision + apply code (src/lib/crypto/payout-finality.ts)
 * with mocked RPC providers, against the real ledger functions in the isolated
 * `pvp_test` schema. These tests fail if the policy regresses to single-provider
 * confirmation, unsafe-block settlement, immediate refunds, or non-idempotent refunds.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { migrateTestSchemaToReal } from "./money";
import {
  applyPayoutDecision,
  decidePayout,
  type FinalityClient,
  type ReceiptLike,
} from "../../src/lib/crypto/payout-finality";

type Hex = `0x${string}`;
const hex = (n: number) => ("0x" + randomBytes(n).toString("hex")) as Hex;

// ---------- mocked providers ----------
interface View {
  receipt: ReceiptLike | null | "down";
  blockHash?: Hex | "down";
  txs?: string[];
}
function provider(view: () => View): FinalityClient {
  return {
    async getTransactionReceipt() {
      const r = view().receipt;
      if (r === "down" || r === null)
        throw new Error(r === "down" ? "provider unavailable" : "receipt not found");
      return r;
    },
    async getBlock({ blockNumber }) {
      const v = view();
      if (v.blockHash === "down" || v.receipt === "down") throw new Error("provider unavailable");
      return {
        hash: (v.blockHash ?? null) as Hex | null,
        number: blockNumber,
        transactions: v.txs ?? [],
      };
    },
  };
}
const BLOCK = 100n;
const SAFE = 150n;
const UNSAFE = 99n;
function scenario(tx: Hex) {
  const bh = hex(32);
  const ok = (status: "success" | "reverted", blockHash = bh): View => ({
    receipt: { status, blockNumber: BLOCK, blockHash },
    blockHash,
    txs: [tx],
  });
  const state = { a: ok("success"), b: ok("success") };
  const p = {
    primary: provider(() => state.a),
    secondary: provider(() => state.b),
    networkMode: "mainnet",
  };
  return { state, p, ok, bh };
}

// ---------- pure policy tests (no DB) ----------
describe("payout finality policy (pure)", () => {
  it("confirms only with safe block + both providers agreeing on success", async () => {
    const tx = hex(32);
    const s = scenario(tx);
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("confirm");
    expect((await decidePayout(s.p, tx, UNSAFE)).action).toBe("wait_unsafe");
  });
  it("releases only with safe block + both providers agreeing on failure", async () => {
    const tx = hex(32);
    const s = scenario(tx);
    s.state.a = s.ok("reverted");
    s.state.b = s.ok("reverted");
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("release");
    expect((await decidePayout(s.p, tx, UNSAFE)).action).toBe("wait_unsafe");
  });
  it("status disagreement (either direction) never settles or refunds", async () => {
    const tx = hex(32);
    const s = scenario(tx);
    s.state.b = s.ok("reverted");
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("wait_agreement");
    s.state.a = s.ok("reverted");
    s.state.b = s.ok("success");
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("wait_agreement");
  });
  it("block hash disagreement (reorg) and missing tx in block never settle", async () => {
    const tx = hex(32);
    const s = scenario(tx);
    s.state.b = s.ok("success", hex(32));
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("wait_agreement");
    s.state.b = s.ok("success");
    s.state.a = { ...s.ok("success"), txs: [] };
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("wait_agreement");
  });
  it("mainnet never falls back to a single provider", async () => {
    const tx = hex(32);
    const s = scenario(tx);
    expect((await decidePayout({ ...s.p, secondary: null }, tx, SAFE)).action).toBe(
      "wait_agreement",
    );
    s.state.b = { receipt: "down" };
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("wait_agreement");
    s.state.b = { ...s.ok("success"), blockHash: "down" };
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("wait_agreement");
  });
  it("no primary receipt (dropped / replaced / primary down) takes no money action", async () => {
    const tx = hex(32);
    const s = scenario(tx);
    s.state.a = { receipt: null };
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("no_receipt");
    s.state.a = { receipt: "down" };
    expect((await decidePayout(s.p, tx, SAFE)).action).toBe("no_receipt");
  });
});

// ---------- ledger integration ----------
const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 24, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});
let TREASURY = "";
const one = async (q: Promise<postgres.Row[]>) => (await q)[0]?.r;
const addr = () => "0x" + randomBytes(20).toString("hex");

async function call(fn: string, args: Record<string, unknown>) {
  if (fn === "crypto_withdrawal_confirmed")
    return sql`select pvp_test.crypto_withdrawal_confirmed(${args.p_id as string})`;
  if (fn === "crypto_withdrawal_failed")
    return sql`select pvp_test.crypto_withdrawal_failed(${args.p_id as string}, ${args.p_reason as string})`;
  if (fn === "crypto_raise_incident")
    return sql`select pvp_test.crypto_raise_incident(${args.p_check as string}, ${args.p_fp as string}, ${sql.json(args.p_details as postgres.JSONValue)})`;
  throw new Error("unexpected rpc " + fn);
}
/** One worker pass over a SUBMITTED withdrawal, exactly as runWithdrawalWorker does it. */
const workerPass = async (
  p: Parameters<typeof decidePayout>[0],
  id: string,
  tx: Hex,
  safe: bigint,
) => applyPayoutDecision(call, id, tx, await decidePayout(p, tx, safe));

async function newUser(name: string) {
  const id = randomUUID();
  await sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${id}, true)`;
    await tx`select pvp_test.ensure_profile(${name + id.slice(0, 6)}, true)`;
  });
  const w = addr();
  await sql`insert into pvp_test.user_wallets (user_id, chain_type, address, normalized_address, wallet_provider, is_verified, is_primary, verified_at)
    values (${id}, 'EVM', ${w}, ${w}, 'metamask', true, true, now())`;
  const dep = await one(
    sql`select pvp_test.crypto_observe_deposit(84532, 'USDC', ${hex(32)}, 0, 100, ${w}, ${TREASURY}, '100000000') as r`,
  );
  await one(sql`select pvp_test.crypto_credit_deposit(${dep.id}, null) as r`);
  return id;
}
const bal = async (uid: string, kind = "user_available") =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = 'real'`
    )[0]?.balance ?? 0,
  );
const status = async (id: string) =>
  (await sql`select status from pvp_test.crypto_withdrawals where id = ${id}`)[0].status as string;
const count = async (key: string) =>
  Number(
    (
      await sql`select count(*) c from pvp_test.ledger_transactions where idempotency_key = ${key}`
    )[0].c,
  );
const custody = async () =>
  Number(
    (
      await sql`select coalesce(sum(balance),0)::bigint b from pvp_test.wallet_accounts where kind = 'external_custody' and account_type = 'real'`
    )[0].b,
  );
const incidents = async (id: string) =>
  Number(
    (
      await sql`select coalesce(sum(occurrences),0)::int c from pvp_test.integrity_incidents where fingerprint = ${"crypto_withdrawal_rpc:" + id}`
    )[0].c,
  );

async function submitted(uid: string, cents: number, tx: Hex) {
  const w = await one(
    sql`select pvp_test.crypto_request_withdrawal(${uid}, 84532, 'USDC', ${cents}, null, true) as r`,
  );
  await sql`select pvp_test.crypto_withdrawal_signed(${w.id}, ${tx}, ${Math.floor(Math.random() * 1e9)}, '0x00')`;
  await sql`select pvp_test.crypto_withdrawal_broadcast(${w.id})`;
  expect(await status(w.id)).toBe("SUBMITTED");
  return w.id as string;
}

async function invariants() {
  const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  expect(
    (
      await sql`select id from pvp_test.wallet_accounts where kind not in ('test_faucet','external_custody','house_bankroll') and balance < 0`
    ).length,
  ).toBe(0);
  expect(
    (
      await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`
    ).length,
  ).toBe(0);
  expect(
    (await sql`select tx_id from pvp_test.ledger_postings group by tx_id having sum(amount) <> 0`)
      .length,
  ).toBe(0);
  expect(
    (
      await sql`select idempotency_key from pvp_test.ledger_transactions group by idempotency_key having count(*) > 1`
    ).length,
  ).toBe(0);
  // no withdrawal both settled and released; no orphaned hold on a closed withdrawal
  expect(
    (
      await sql`select id from pvp_test.crypto_withdrawals where settle_ledger_tx_id is not null and release_ledger_tx_id is not null`
    ).length,
  ).toBe(0);
  expect(
    (
      await sql`select id from pvp_test.crypto_withdrawals where status = 'CONFIRMED' and (settle_ledger_tx_id is null or release_ledger_tx_id is not null)`
    ).length,
  ).toBe(0);
  expect(
    (
      await sql`select id from pvp_test.crypto_withdrawals where status in ('RELEASED','FAILED') and settle_ledger_tx_id is not null`
    ).length,
  ).toBe(0);
}

/** Asserts a withdrawal is still exactly "held": no terminal state, no ledger effect. */
async function expectHeld(
  uid: string,
  id: string,
  availAfterHold: number,
  cents: number,
  custodyBefore: number,
) {
  expect(await status(id)).toBe("SUBMITTED");
  expect(await bal(uid)).toBe(availAfterHold);
  expect(await bal(uid, "user_locked")).toBe(cents);
  expect(await count(`withdrawal:${id}:settle`)).toBe(0);
  expect(await count(`withdrawal:${id}:release`)).toBe(0);
  expect(await custody()).toBe(custodyBefore);
}

d("withdrawal finality (ledger)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await sql.unsafe(`alter table pvp_test.chain_networks disable trigger user;
      update pvp_test.chain_networks set is_enabled = true where chain_id = 84532;
      alter table pvp_test.chain_networks enable trigger user;
      alter table pvp_test.chain_assets disable trigger user;
      update pvp_test.chain_assets set is_enabled = true, ledger_asset = 'USD', ledger_account_type = 'real' where chain_id = 84532;
      alter table pvp_test.chain_assets enable trigger user;
      alter table pvp_test.chain_treasury_accounts disable trigger user;
      update pvp_test.chain_treasury_accounts set is_active = true where chain_id = 84532;
      alter table pvp_test.chain_treasury_accounts enable trigger user;`);
    TREASURY = (
      await sql`select address from pvp_test.chain_treasury_accounts where role = 'deposit' and chain_id = 84532`
    )[0].address.toLowerCase();
    await sql`update pvp_test.crypto_settings set daily_limit_cents = 100000000, daily_global_limit_cents = 1000000000, payout_float_max_cents = 1000000000, auto_approve_cents = 100000000`;
  }, 180_000);

  async function setup(cents = 700) {
    const uid = await newUser("wf");
    const tx = hex(32);
    const s = scenario(tx);
    const id = await submitted(uid, cents, tx);
    return { uid, tx, s, id, cents, avail: await bal(uid), custody0: await custody() };
  }

  for (const [label, a, b] of [
    ["A success / B failed", "success", "reverted"],
    ["A failed / B success", "reverted", "success"],
  ] as const) {
    it(`1. provider disagreement (${label}) keeps funds held, alerts, then retries safely`, async () => {
      const t = await setup();
      t.s.state.a = t.s.ok(a);
      t.s.state.b = t.s.ok(b);
      for (let i = 0; i < 3; i++)
        expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe("awaiting_agreement");
      await expectHeld(t.uid, t.id, t.avail, t.cents, t.custody0);
      expect(await incidents(t.id)).toBeGreaterThanOrEqual(1);
      // providers converge on the true outcome → exactly one terminal effect
      t.s.state.a = t.s.ok("success");
      t.s.state.b = t.s.ok("success");
      expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe("confirmed");
      expect(await status(t.id)).toBe("CONFIRMED");
      expect(await count(`withdrawal:${t.id}:settle`)).toBe(1);
      await invariants();
    });
  }

  it("2. both agree on failure: exactly one refund, replays/concurrency/restart do nothing", async () => {
    const t = await setup();
    t.s.state.a = t.s.ok("reverted");
    t.s.state.b = t.s.ok("reverted");
    await Promise.allSettled(Array.from({ length: 5 }, () => workerPass(t.s.p, t.id, t.tx, SAFE)));
    for (let i = 0; i < 3; i++) await workerPass(t.s.p, t.id, t.tx, SAFE); // restarts / replays
    await sql`select pvp_test.crypto_withdrawal_confirmed(${t.id})`; // late contradictory confirmation
    expect(await bal(t.uid)).toBe(t.avail + t.cents);
    expect(await bal(t.uid, "user_locked")).toBe(0);
    expect(await count(`withdrawal:${t.id}:release`)).toBe(1);
    expect(await count(`withdrawal:${t.id}:settle`)).toBe(0);
    expect(await status(t.id)).not.toBe("CONFIRMED");
    expect(await custody()).toBe(t.custody0);
    await invariants();
  });

  it("3. both agree on success: exactly one finalization, replays/concurrency/restart do nothing", async () => {
    const t = await setup();
    await Promise.allSettled(Array.from({ length: 5 }, () => workerPass(t.s.p, t.id, t.tx, SAFE)));
    for (let i = 0; i < 3; i++) await workerPass(t.s.p, t.id, t.tx, SAFE);
    await sql`select pvp_test.crypto_withdrawal_failed(${t.id}, 'late failure')`; // late contradictory failure
    await expect(
      sql`select pvp_test.crypto_withdrawal_signed(${t.id}, ${hex(32)}, 1, '0x00')`,
    ).rejects.toThrow(/NOT_APPROVED/);
    expect(await status(t.id)).toBe("CONFIRMED");
    expect(await bal(t.uid)).toBe(t.avail);
    expect(await bal(t.uid, "user_locked")).toBe(0);
    expect(await count(`withdrawal:${t.id}:settle`)).toBe(1);
    expect(await count(`withdrawal:${t.id}:release`)).toBe(0);
    expect(await custody()).toBe(t.custody0 + t.cents);
    await invariants();
  });

  for (const outcome of ["success", "reverted"] as const) {
    it(`4. unsafe block (${outcome}) never finishes or refunds until safe`, async () => {
      const t = await setup();
      t.s.state.a = t.s.ok(outcome);
      t.s.state.b = t.s.ok(outcome);
      for (let i = 0; i < 3; i++)
        expect(await workerPass(t.s.p, t.id, t.tx, UNSAFE)).toBe("confirming");
      await expectHeld(t.uid, t.id, t.avail, t.cents, t.custody0);
      expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe(
        outcome === "success" ? "confirmed" : "released",
      );
      expect(
        await count(`withdrawal:${t.id}:${outcome === "success" ? "settle" : "release"}`),
      ).toBe(1);
      await invariants();
    });
  }

  it("5. secondary provider unavailable: held, no single-provider fallback; restored → exactly once", async () => {
    const t = await setup();
    t.s.state.b = { receipt: "down" };
    for (let i = 0; i < 3; i++)
      expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe("awaiting_agreement");
    expect(await workerPass({ ...t.s.p, secondary: null }, t.id, t.tx, SAFE)).toBe(
      "awaiting_agreement",
    );
    await expectHeld(t.uid, t.id, t.avail, t.cents, t.custody0);
    t.s.state.b = t.s.ok("success");
    expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe("confirmed");
    await workerPass(t.s.p, t.id, t.tx, SAFE);
    expect(await count(`withdrawal:${t.id}:settle`)).toBe(1);
    await invariants();
  });

  for (const n of [2, 5, 20]) {
    for (const outcome of ["success", "reverted"] as const) {
      it(`6. ${n} concurrent workers (${outcome}) → one terminal financial effect`, async () => {
        const t = await setup();
        t.s.state.a = t.s.ok(outcome);
        t.s.state.b = t.s.ok(outcome);
        const r = await Promise.allSettled(
          Array.from({ length: n }, () => workerPass(t.s.p, t.id, t.tx, SAFE)),
        );
        expect(r.some((x) => x.status === "fulfilled")).toBe(true);
        expect(await count(`withdrawal:${t.id}:settle`)).toBe(outcome === "success" ? 1 : 0);
        expect(await count(`withdrawal:${t.id}:release`)).toBe(outcome === "success" ? 0 : 1);
        expect(await bal(t.uid, "user_locked")).toBe(0);
        expect(await bal(t.uid)).toBe(outcome === "success" ? t.avail : t.avail + t.cents);
        await invariants();
      }, 30_000);
    }
  }

  it("7. replaying confirmations, failures, worker retries, reconciliation and user cancel adds no effect", async () => {
    const t = await setup();
    await workerPass(t.s.p, t.id, t.tx, SAFE);
    const snap = { avail: await bal(t.uid), custody: await custody() };
    for (let i = 0; i < 3; i++) {
      await sql`select pvp_test.crypto_withdrawal_confirmed(${t.id})`;
      await sql`select pvp_test.crypto_withdrawal_failed(${t.id}, 'replay')`;
      await workerPass(t.s.p, t.id, t.tx, SAFE);
      await sql`select pvp_test.crypto_reconcile(${0}, ${sql.json({ replay: i })})`.catch(
        () => null,
      );
      await expect(
        one(sql`select pvp_test.crypto_cancel_withdrawal(${t.uid}, ${t.id}) as r`),
      ).rejects.toThrow();
    }
    expect(await bal(t.uid)).toBe(snap.avail);
    expect(await custody()).toBe(snap.custody);
    expect(await count(`withdrawal:${t.id}:settle`)).toBe(1);
    expect(await count(`withdrawal:${t.id}:release`)).toBe(0);
    // players cannot move withdrawal state directly
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`update pvp_test.crypto_withdrawals set status = 'RELEASED' where id = ${t.id}`;
      }),
    ).rejects.toThrow();
    await invariants();
  });

  it("8. replaced/dropped payout keeps funds held; no refund + payout, no double effect", async () => {
    const t = await setup();
    // original tx dropped/replaced: primary has no receipt → no money action
    t.s.state.a = { receipt: null };
    for (let i = 0; i < 3; i++)
      expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe("no_receipt");
    await expectHeld(t.uid, t.id, t.avail, t.cents, t.custody0);
    // a reorg-style view: primary sees a revert in a block the secondary does not agree on
    t.s.state.a = t.s.ok("reverted", hex(32));
    expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe("awaiting_agreement");
    await expectHeld(t.uid, t.id, t.avail, t.cents, t.custody0);
    // canonical outcome is success → exactly one settle, and a later revert report cannot refund
    t.s.state.a = t.s.ok("success");
    expect(await workerPass(t.s.p, t.id, t.tx, SAFE)).toBe("confirmed");
    t.s.state.a = t.s.ok("reverted");
    t.s.state.b = t.s.ok("reverted");
    await workerPass(t.s.p, t.id, t.tx, SAFE);
    expect(await status(t.id)).toBe("CONFIRMED");
    expect(await count(`withdrawal:${t.id}:settle`)).toBe(1);
    expect(await count(`withdrawal:${t.id}:release`)).toBe(0);
    expect(await custody()).toBe(t.custody0 + t.cents);
    await invariants();
  });
});
