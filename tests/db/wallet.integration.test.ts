/**
 * Wallet-identity integration suite against the isolated `pvp_test` schema.
 * Requires SUPABASE_DB_URL; skipped otherwise.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { buildTestSchemaSql } from "./schema";
import { buildWalletMessage, normalizeAddress, signatureMatches } from "../../src/lib/web3/message";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);

async function newUser(name: string) {
  const id = randomUUID();
  await sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${id}, true)`;
    await tx`select pvp_test.ensure_profile(${name}, true)`;
  });
  return id;
}
type Ch = { ok: boolean; code?: string; id: string; address: string; nonce: string; issued_at: string; expires_at: string; version: number };
const issue = async (u: string, a: string) => (await sql`select pvp_test.wallet_issue_challenge(${u}::uuid, ${a}) r`)[0].r as Ch;
const consume = async (id: string, u: string, n: string) =>
  (await sql`select pvp_test.wallet_consume_and_verify(${id}::uuid, ${u}::uuid, ${n}) r`)[0].r as { ok: boolean; code?: string };
const msg = (c: Ch) => buildWalletMessage({ address: c.address, nonce: c.nonce, issuedAt: c.issued_at, expiresAt: c.expires_at, version: c.version });

let n = 0;
const uname = () => `wal${Date.now().toString(36)}${n++}`.slice(0, 20);

d("wallet identity (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 120_000);
  afterAll(async () => {
    await sql.end();
  });

  it("issues a secure, DB-timed 10-minute challenge", async () => {
    const u = await newUser(uname());
    const a = privateKeyToAccount(generatePrivateKey()).address;
    const [c1, c2] = [await issue(u, a), await issue(u, a)];
    expect(c1.ok && c2.ok).toBe(true);
    expect(c1.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(c1.nonce).not.toBe(c2.nonce);
    expect(c1.nonce).not.toContain(a.slice(2).toLowerCase());
    expect(new Date(c1.expires_at).getTime() - new Date(c1.issued_at).getTime()).toBe(600_000);
    const [{ drift }] = await sql`select abs(extract(epoch from (clock_timestamp() - ${c2.issued_at}::timestamptz))) drift`;
    expect(Number(drift)).toBeLessThan(5);
    // Issuing a new challenge retires the earlier one.
    expect((await consume(c1.id, u, a.toLowerCase())).code).toBe("EXPIRED");
  });

  it("rejects invalid input and unknown users", async () => {
    expect((await issue(randomUUID(), privateKeyToAccount(generatePrivateKey()).address)).code).toBe("PROFILE_REQUIRED");
    expect((await issue(await newUser(uname()), "0x123")).code).toBe("INVALID_INPUT");
  });

  it("full verification: valid signature, then the challenge can never be reused", async () => {
    const u = await newUser(uname());
    const acct = privateKeyToAccount(generatePrivateKey());
    const c = await issue(u, acct.address);
    const sig = await acct.signMessage({ message: msg(c) });
    expect(await signatureMatches(msg(c), sig, c.address)).toBe(true);
    expect((await consume(c.id, u, normalizeAddress(c.address).normalized)).ok).toBe(true);
    expect((await consume(c.id, u, normalizeAddress(c.address).normalized)).code).toBe("CONSUMED");
    const [w] = await sql`select * from pvp_test.user_wallets where user_id = ${u}`;
    expect(w.is_verified).toBe(true);
    expect(w.verified_at).not.toBeNull();
    expect(w.normalized_address).toBe(acct.address.toLowerCase());
    expect(w.address).toBe(acct.address);
  });

  it("expired challenge is rejected by the database clock", async () => {
    const u = await newUser(uname());
    const a = privateKeyToAccount(generatePrivateKey()).address;
    const c = await issue(u, a);
    await sql`update pvp_test.wallet_verification_challenges set issued_at = issued_at - interval '11 minutes', expires_at = expires_at - interval '11 minutes' where id = ${c.id}`;
    expect((await consume(c.id, u, a.toLowerCase())).code).toBe("EXPIRED");
    expect((await sql`select count(*)::int c from pvp_test.user_wallets where user_id=${u} and is_verified`)[0].c).toBe(0);
  });

  it("another user's challenge and a different address are rejected", async () => {
    const u1 = await newUser(uname());
    const u2 = await newUser(uname());
    const a = privateKeyToAccount(generatePrivateKey()).address;
    const c = await issue(u1, a);
    expect((await consume(c.id, u2, a.toLowerCase())).code).toBe("NOT_FOUND");
    expect((await consume(c.id, u1, privateKeyToAccount(generatePrivateKey()).address.toLowerCase())).code).toBe("ADDRESS_MISMATCH");
    expect((await consume(c.id, u1, a.toLowerCase())).ok).toBe(true);
  });

  it("20 concurrent verifications of one challenge: exactly one succeeds", async () => {
    const u = await newUser(uname());
    const a = privateKeyToAccount(generatePrivateKey()).address;
    const c = await issue(u, a);
    const rs = await Promise.all(Array.from({ length: 20 }, () => consume(c.id, u, a.toLowerCase())));
    expect(rs.filter((r) => r.ok).length).toBe(1);
    expect(rs.filter((r) => r.code === "CONSUMED").length).toBe(19);
  });

  it("one wallet can't be verified on two accounts, even racing in parallel", async () => {
    const a = privateKeyToAccount(generatePrivateKey()).address;
    const u1 = await newUser(uname());
    const u2 = await newUser(uname());
    const [c1, c2] = [await issue(u1, a), await issue(u2, a)];
    const rs = await Promise.all([consume(c1.id, u1, a.toLowerCase()), consume(c2.id, u2, a.toLowerCase())]);
    expect(rs.filter((r) => r.ok).length).toBe(1);
    expect(rs.filter((r) => r.code === "ALREADY_LINKED").length).toBe(1);
    // The loser's challenge was not consumed (rolled back), and new challenges are refused.
    const loser = rs[0].ok ? { u: u2, c: c2 } : { u: u1, c: c1 };
    const [row] = await sql`select consumed_at from pvp_test.wallet_verification_challenges where id=${loser.c.id}`;
    expect(row.consumed_at).toBeNull();
    expect((await issue(loser.u, a)).code).toBe("ALREADY_LINKED");
    // Database-level guarantee, independent of the function.
    await expect(
      sql`insert into pvp_test.user_wallets (user_id, address, normalized_address, is_verified, verified_at) values (${loser.u}, ${a}, ${a.toLowerCase()}, true, now())`,
    ).rejects.toThrow(/unique|duplicate/);
  });

  it("mixed-case and lowercase addresses are one wallet", async () => {
    const u = await newUser(uname());
    const a = privateKeyToAccount(generatePrivateKey()).address;
    await sql`select pvp_test.wallet_touch(${u}::uuid, ${a})`;
    await sql`select pvp_test.wallet_touch(${u}::uuid, ${normalizeAddress(a).checksummed})`;
    expect((await sql`select count(*)::int c from pvp_test.user_wallets where user_id=${u}`)[0].c).toBe(1);
    await expect(sql`insert into pvp_test.user_wallets (user_id, address, normalized_address) values (${u}, ${a}, ${a})`).rejects.toThrow();
  });

  it("an account switch never replaces the verified wallet", async () => {
    const u = await newUser(uname());
    const a = privateKeyToAccount(generatePrivateKey()).address;
    const b = privateKeyToAccount(generatePrivateKey()).address;
    const c = await issue(u, a);
    expect((await consume(c.id, u, a.toLowerCase())).ok).toBe(true);
    await sql`select pvp_test.wallet_touch(${u}::uuid, ${b})`;
    const rows = await sql`select normalized_address, is_verified, is_primary from pvp_test.user_wallets where user_id=${u} order by is_verified desc`;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ normalized_address: a.toLowerCase(), is_verified: true, is_primary: true });
    expect(rows[1]).toMatchObject({ normalized_address: b.toLowerCase(), is_verified: false });
  });

  it("rate limits challenge creation and writes audit events", async () => {
    const u = await newUser(uname());
    const a = privateKeyToAccount(generatePrivateKey()).address;
    for (let i = 0; i < 10; i++) expect((await issue(u, a)).ok).toBe(true);
    expect((await issue(u, a)).code).toBe("RATE_LIMITED");
    await sql`select pvp_test.wallet_log('WALLET_VERIFIED', ${u}::uuid, '{"address":"0x71A4...A92F"}'::jsonb)`;
    expect((await sql`select count(*)::int c from pvp_test.auth_events where user_id=${u} and event='WALLET_VERIFIED'`)[0].c).toBe(1);
    await expect(sql`select pvp_test.wallet_log('ANYTHING', ${u}::uuid, '{}'::jsonb)`).rejects.toThrow(/INVALID_EVENT/);
  });

  it("test-credit balances are untouched by wallet actions", async () => {
    const u = await newUser(uname());
    const before = await sql`select kind, balance from pvp_test.wallet_accounts where owner_id=${u} order by kind`;
    const a = privateKeyToAccount(generatePrivateKey()).address;
    const c = await issue(u, a);
    await consume(c.id, u, a.toLowerCase());
    expect(await sql`select kind, balance from pvp_test.wallet_accounts where owner_id=${u} order by kind`).toEqual(before);
  });
});
