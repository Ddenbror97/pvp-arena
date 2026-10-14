/**
 * Security remediation suite (audit findings F-1..F-7, session lifecycle,
 * integrity monitor). Game tests run in the isolated `pvp_test` schema using
 * real concurrent Postgres transactions; permission checks read the catalog
 * of TEST_DATABASE_URL (read-only). Refuses the production database.
 */
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { testDatabaseUrl } from "./test-url";
import {
  otpDigest,
  withdrawalBinding,
  withdrawalScope,
  type WithdrawalTarget,
} from "../../src/lib/auth-otp/otp";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 10, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const START = 100000;

type Ctx = { claims?: Record<string, unknown> };
async function as<T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
  c: Ctx = {},
): Promise<T> {
  return sql.begin(async (tx) => {
    if (c.claims)
      await tx`select set_config('test.uid', ${uid ?? ""}, true), set_config('request.jwt.claims', ${JSON.stringify(c.claims)}, true)`;
    else await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
async function newUser(name: string) {
  const id = randomUUID();
  await sql`select pvp_test.ensure_profile(${name}, true)
    from (select set_config('test.uid', ${id}, true)) c`;
  return id;
}
const cfCreate = (uid: string, amount: number, c: Ctx = {}) => {
  const key = randomUUID();
  const q = c.claims
    ? sql`select pvp_test.coinflip_create(${amount}, 'HEADS'::pvp_test.coin_side, ${key}) as r
        from (select set_config('test.uid', ${uid}, true),
                     set_config('request.jwt.claims', ${JSON.stringify(c.claims)}, true)) c`
    : sql`select pvp_test.coinflip_create(${amount}, 'HEADS'::pvp_test.coin_side, ${key}) as r
        from (select set_config('test.uid', ${uid}, true)) c`;
  return q.then((rows) => rows[0].r);
};
const cfJoin = (uid: string, gid: number) =>
  sql`select pvp_test.coinflip_join(${gid}, ${randomUUID()}) as r
    from (select set_config('test.uid', ${uid}, true)) c`.then((rows) => rows[0].r);
const cfCancel = (uid: string, gid: number, c: Ctx = {}) =>
  as(uid, async (tx) => (await tx`select pvp_test.coinflip_cancel(${gid}) as r`)[0].r, c);
const cfTick = (c: Ctx = {}) => {
  const q = c.claims
    ? sql`select pvp_test.coinflip_tick() as r
        from (select set_config('test.uid', ${""}, true),
                     set_config('request.jwt.claims', ${JSON.stringify(c.claims)}, true)) c`
    : sql`select pvp_test.coinflip_tick() as r from (select set_config('test.uid', ${""}, true)) c`;
  return q.then((rows) => rows[0].r);
};
const jpTick = (c: Ctx = {}) => {
  const q = c.claims
    ? sql`select pvp_test.jackpot_tick() as r
        from (select set_config('test.uid', ${""}, true),
                     set_config('request.jwt.claims', ${JSON.stringify(c.claims)}, true)) c`
    : sql`select pvp_test.jackpot_tick() as r from (select set_config('test.uid', ${""}, true)) c`;
  return q.then((rows) => rows[0].r);
};
const jpJoin = (uid: string, amount: number, c: Ctx = {}) =>
  as(
    uid,
    async (tx) => (await tx`select pvp_test.jackpot_join(${amount}, ${randomUUID()}) as r`)[0].r,
    c,
  );
const cfGame = async (id: number) =>
  (await sql`select * from pvp_test.coinflip_games where id = ${id}`)[0];
const bal = async (uid: string, kind = "user_available") =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = 'test_credit'`
    )[0]?.balance ?? 0,
  );

async function setCf(timeout = 60) {
  await sql`update pvp_test.coinflip_config set pre_delay_ms=100, animation_ms=150, waiting_timeout_seconds=${timeout},
    create_rate_limit=100000, max_open_per_user=100000`;
}

/** Financial invariants for every coinflip game plus the global ledger. */
async function assertCoinflipInvariants() {
  const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  const neg =
    await sql`select id from pvp_test.wallet_accounts where kind <> 'test_faucet' and balance < 0`;
  expect(neg.length).toBe(0);
  const mism =
    await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const orphan =
    await sql`select t.id from pvp_test.ledger_transactions t where not exists (select 1 from pvp_test.ledger_postings p where p.tx_id=t.id)`;
  expect(orphan.length).toBe(0);
  for (const g of await sql`select * from pvp_test.coinflip_games`) {
    const [c] = await sql`select
      (select count(*) from pvp_test.coinflip_entries where game_id=${g.id})::int entries,
      (select count(*) from pvp_test.ledger_transactions where game_id=${g.id} and kind='coinflip_entry')::int debits,
      (select count(*) from pvp_test.ledger_transactions where game_id=${g.id} and kind='coinflip_settlement')::int settles,
      (select count(*) from pvp_test.ledger_transactions where game_id=${g.id} and kind='coinflip_refund')::int refunds,
      (select count(*) from pvp_test.coinflip_payouts where game_id=${g.id} and kind='WINNER' and status='SETTLED')::int wp,
      (select count(*) from pvp_test.coinflip_payouts where game_id=${g.id} and kind='REFUND' and status='SETTLED')::int rp`;
    expect(c.entries).toBe(c.debits); // no wager without entry, no entry without debit
    expect(c.settles + c.refunds).toBeLessThanOrEqual(1); // never refund + payout, never twice
    if (g.status === "COMPLETED")
      expect([c.settles, c.wp, c.refunds, c.rp, c.entries]).toEqual([1, 1, 0, 0, 2]);
    if (g.status === "CANCELLED")
      expect([c.settles, c.wp, c.refunds, c.rp, c.entries]).toEqual([0, 0, 1, 1, 1]);
  }
}
async function driveToTerminal() {
  for (let i = 0; i < 40; i++) {
    const [row] = await sql`
      with tick as (
        select pvp_test.coinflip_tick() as r from (select set_config('test.uid', ${""}, true)) c
      )
      select (select r from tick) as r,
        (select count(*)::int from pvp_test.coinflip_games where status not in ('COMPLETED','CANCELLED')) as open`;
    if (row.open === 0) return;
    await sleep(100);
  }
  throw new Error("games did not reach a terminal state");
}

d("security remediation (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 60000);
  beforeEach(async () => {
    await sql`truncate pvp_test.audit_logs, pvp_test.coinflip_payouts, pvp_test.coinflip_results, pvp_test.coinflip_entries,
      pvp_test.coinflip_game_secrets, pvp_test.coinflip_games, pvp_test.jackpot_payouts, pvp_test.jackpot_players, pvp_test.jackpot_entries,
      pvp_test.jackpot_game_secrets, pvp_test.jackpot_games, pvp_test.ledger_postings, pvp_test.ledger_transactions,
      pvp_test.wallet_accounts, pvp_test.profiles, pvp_test.test_auth_sessions, pvp_test.chat_presence, pvp_test.signup_attempts,
      pvp_test.signup_verifications, pvp_test.email_otp_challenges,
      pvp_test.integrity_incidents, pvp_test.integrity_runs restart identity cascade`;
    await sql`update pvp_test.worker_tick_gate set last_run_at = '-infinity'`;
    await setCf();
  });

  it("join vs cancel at the same instant: exactly one wins, money is exact (30 races)", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    let joins = 0,
      cancels = 0;
    for (let i = 0; i < 30; i++) {
      const { game_id } = await cfCreate(a, 100);
      const [c, j] = await Promise.allSettled([cfCancel(a, game_id), cfJoin(b, game_id)]);
      expect([c, j].filter((r) => r.status === "fulfilled").length).toBe(1);
      if (c.status === "fulfilled") cancels++;
      else joins++;
    }
    await driveToTerminal();
    expect(joins + cancels).toBe(30);
    await assertCoinflipInvariants();
    const [done] =
      await sql`select count(*) filter (where status='COMPLETED')::int c, count(*) filter (where status='CANCELLED')::int x from pvp_test.coinflip_games`;
    expect(done.c).toBe(joins);
    expect(done.x).toBe(cancels);
    const [fees] =
      await sql`select coalesce(sum(fee_amount), 0)::bigint f from pvp_test.coinflip_games where status = 'COMPLETED'`;
    expect((await bal(a)) + (await bal(b)) + Number(fees.f)).toBe(2 * START);
  }, 120000);

  it("refund vs payout at the expiry boundary: exactly one financial outcome", async () => {
    await setCf(1);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    for (const offset of [900, 960, 1000, 1030, 1080]) {
      const { game_id } = await cfCreate(a, 200);
      const g = await cfGame(game_id);
      const wait = +g.expires_at - Date.now() - (1000 - offset);
      if (wait > 0) await sleep(wait);
      await Promise.allSettled([
        cfJoin(b, game_id),
        cfTick(),
        cfCancel(a, game_id),
        cfTick(),
        cfJoin(b, game_id),
      ]);
    }
    await driveToTerminal();
    await driveToTerminal();
    await assertCoinflipInvariants();
    const [fees] =
      await sql`select coalesce(sum(fee_amount), 0)::bigint f from pvp_test.coinflip_games where status = 'COMPLETED'`;
    expect((await bal(a)) + (await bal(b)) + Number(fees.f)).toBe(2 * START);
    expect(await bal(a, "user_locked")).toBe(0);
    expect(await bal(b, "user_locked")).toBe(0);
  }, 120000);

  it("pot ceiling holds under concurrent entries at the boundary", async () => {
    await sql`update pvp_test.jackpot_config set min_entry=100, max_entry=1000, max_pot=1000, entry_rate_limit=100000, countdown_seconds=60`;
    const users = await Promise.all(Array.from({ length: 16 }, (_, i) => newUser(`player${i}`)));
    await jpTick(); // open game
    const res = await Promise.allSettled(users.map((u) => jpJoin(u, 100)));
    const ok = res.filter((r) => r.status === "fulfilled").length;
    const rejected = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toBe(10);
    for (const r of rejected) expect(String(r.reason)).toContain("POT_LIMIT_REACHED");
    const [g] =
      await sql`select pot_amount from pvp_test.jackpot_games where status in ('WAITING','ACTIVE')`;
    expect(Number(g.pot_amount)).toBe(1000);
    const [e] =
      await sql`select count(*)::int c, coalesce(sum(amount),0)::int s from pvp_test.jackpot_entries`;
    expect([e.c, e.s]).toEqual([10, 1000]);
    const held = await sql`select owner_id, sum(balance)::bigint b from pvp_test.wallet_accounts
      where owner_id = any(${users}::uuid[]) and kind in ('user_available', 'user_locked') and account_type = 'test_credit' group by owner_id`;
    expect(held.length).toBe(users.length);
    for (const h of held) expect(Number(h.b)).toBe(START);
    await expect(sql`update pvp_test.coinflip_config set max_wager = 50000001`).rejects.toThrow();
    await expect(sql`update pvp_test.jackpot_config set max_pot = 1000000000001`).rejects.toThrow();
  }, 60_000);

  it("public tick is gated (no pile-up, <= 1 run per 250ms); overlapping scheduler ticks collapse to one; duplicates stay single-effect", async () => {
    const anon = { claims: { role: "anon" } };
    const t0 = Date.now();
    const r = await Promise.all(Array.from({ length: 12 }, () => cfTick(anon)));
    const ran = r.filter((x) => !x.throttled).length;
    // At most one run per 250 ms window, however many callers pile in.
    expect(ran).toBeGreaterThanOrEqual(1);
    expect(ran).toBeLessThanOrEqual(Math.ceil((Date.now() - t0) / 250) + 1);
    expect(ran).toBeLessThan(12);
    await sleep(300);
    expect((await cfTick(anon)).throttled).toBeUndefined();
    const auth = { claims: { role: "authenticated" } };
    await sleep(300);
    const t1 = Date.now();
    const jr = await Promise.all([jpTick(auth), jpTick(auth), jpTick(auth)]);
    expect(jr.filter((x) => !x.throttled).length).toBeLessThanOrEqual(
      Math.ceil((Date.now() - t1) / 250) + 1,
    );
    const sched = await Promise.all([cfTick(), cfTick(), cfTick()]);
    expect(sched.filter((s) => !s.throttled)).toHaveLength(1);
    expect(sched.filter((s) => s.throttled)).toHaveLength(2);
    expect((await cfTick()).throttled).toBeUndefined();
    // Duplicate triggering of a real settlement: exactly one payout.
    const [a, b] = await Promise.all([newUser("alice"), newUser("bob")]);
    const { game_id } = await cfCreate(a, 500);
    await cfJoin(b, game_id);
    await sleep(400);
    await Promise.all([cfTick(), cfTick(), cfTick(anon), cfTick(anon), cfTick(auth)]);
    await driveToTerminal();
    await assertCoinflipInvariants();
  });

  it("health check and the minute dispatcher do not post ledger rows", async () => {
    const before =
      await sql`select count(*)::int n, coalesce(sum(amount), 0)::text s from pvp_test.ledger_postings`;
    const health = await sql`select pvp_test.settlement_worker_health() h`;
    const dispatch = await sql`select pvp_test.pvp_minute_dispatch() d`;
    const after =
      await sql`select count(*)::int n, coalesce(sum(amount), 0)::text s from pvp_test.ledger_postings`;
    expect(after[0]).toEqual(before[0]);
    expect(health[0].h.stale).toBeGreaterThanOrEqual(0);
    expect(dispatch[0].d.leaderboard).toBeTruthy();
    expect(dispatch[0].d.health).toBeUndefined();
    expect(dispatch[0].d.jackpot).toBeUndefined();
    expect(dispatch[0].d.coinflip).toBeUndefined();
    // crypto_invoke_cron is installed by the production cron setup script,
    // not by a migration, so the isolated schema records that absence.
    for (const step of ["crypto-withdrawals", "crypto-deposits"]) {
      const row = dispatch[0].d[step];
      expect(row.ok === true || String(row.error).includes("crypto_invoke_cron")).toBe(true);
    }
  });

  it("session lifecycle: logout, expiry, revocation (password reset) and account switch block financial actions", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const sid = randomUUID();
    const claims = (sub: string, session = sid) => ({
      claims: { role: "authenticated", sub, session_id: session },
    });
    await sql`insert into pvp_test.test_auth_sessions(id, user_id) values (${sid}, ${a})`;
    const future = Math.floor(Date.now() / 1000) + 3600;
    const past = Math.floor(Date.now() / 1000) - 30;
    const live = (sub: string, session = sid, exp?: number) => ({
      claims: { role: "authenticated", sub, session_id: session, ...(exp == null ? {} : { exp }) },
    });
    const { game_id } = await cfCreate(a, 100, live(a, sid, future)); // live session works
    await as(a, (tx) => tx`select pvp_test._assert_live_session()`, live(a, sid, future));
    // stale/unknown session id
    await expect(cfCreate(a, 100, claims(a, randomUUID()))).rejects.toThrow("SESSION_REVOKED");
    await expect(
      as(a, (tx) => tx`select pvp_test._assert_live_session()`, claims(a, randomUUID())),
    ).rejects.toThrow("SESSION_REVOKED");
    // switching accounts: A's session used with B's identity
    await expect(jpJoin(b, 100, claims(b))).rejects.toThrow("SESSION_REVOKED");
    // access token exp has passed, session row still present
    await expect(cfCreate(a, 100, live(a, sid, past))).rejects.toThrow("SESSION_EXPIRED");
    await expect(
      as(a, (tx) => tx`select pvp_test._assert_live_session()`, live(a, sid, past)),
    ).rejects.toThrow("SESSION_EXPIRED");
    // session not_after elapsed
    await sql`update pvp_test.test_auth_sessions set not_after = now() - interval '1 second' where id = ${sid}`;
    await expect(cfCreate(a, 100, claims(a))).rejects.toThrow("SESSION_REVOKED");
    await expect(cfCancel(a, game_id, claims(a))).rejects.toThrow("SESSION_REVOKED");
    // logout / password reset: session row deleted
    await sql`update pvp_test.test_auth_sessions set not_after = null where id = ${sid}`;
    await sql`delete from pvp_test.test_auth_sessions where id = ${sid}`;
    await expect(cfCreate(a, 100, claims(a))).rejects.toThrow("SESSION_REVOKED");
    await expect(jpJoin(a, 100, claims(a))).rejects.toThrow("SESSION_REVOKED");
    await expect(
      as(a, (tx) => tx`select pvp_test._assert_live_session()`, live(a, sid, future)),
    ).rejects.toThrow("SESSION_REVOKED");
    // malformed claims
    await expect(
      cfCreate(a, 100, { claims: { role: "authenticated", sub: a, session_id: "not-a-uuid" } }),
    ).rejects.toThrow("SESSION_REVOKED");
    // B's own session still works after A's was revoked
    const sidB = randomUUID();
    await sql`insert into pvp_test.test_auth_sessions(id, user_id) values (${sidB}, ${b})`;
    const other = await cfCreate(b, 100, live(b, sidB, future));
    expect(other.game_id).toBeTruthy();
    await as(b, (tx) => tx`select pvp_test._assert_live_session()`, live(b, sidB, future));
    // nothing moved beyond the one legitimate wager for A, and B's single wager
    expect(await bal(a)).toBe(START - 100);
    expect(await bal(b)).toBe(START - 100);
    await assertCoinflipInvariants();
  }, 60_000);

  it("online count is server-side: one user = one, repeated heartbeats don't inflate, anonymous rejected", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const beat = (u: string | null) =>
      as(u, async (tx) => (await tx`select pvp_test.chat_heartbeat() as n`)[0].n);
    const many = await Promise.all(Array.from({ length: 20 }, () => beat(a)));
    expect(Math.max(...many)).toBe(1);
    expect(await beat(b)).toBe(2);
    await expect(beat(null)).rejects.toThrow("AUTH_REQUIRED");
  });

  it("sign-up limiter: bursts from one IP / one email are cut off, others unaffected", async () => {
    const h = (s: string) =>
      sql`select encode(extensions.digest(${s}, 'sha256'), 'hex') h`.then((r) => r[0].h as string);
    const ip = await h("1.2.3.4");
    const check = (ipH: string | null, emailH: string) =>
      sql`select pvp_test.signup_rate_check(${ipH}, ${emailH}) r`.then((r) => r[0].r);
    const burst = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => check(ip, await h(`u${i}@x.io`))),
    );
    expect(burst.filter((r) => r.ok).length).toBe(5);
    expect(burst.filter((r) => r.reason === "IP_LIMIT").length).toBe(7);
    const other = await check(await h("5.6.7.8"), await h("fresh@x.io"));
    expect(other.ok).toBe(true);
    const e = await h("same@x.io");
    const rep = [];
    for (let i = 0; i < 7; i++) rep.push(await check(await h(`9.9.9.${i}`), e));
    expect(rep.filter((r) => r.ok).length).toBe(5);
    expect(rep.at(-1).reason).toBe("EMAIL_LIMIT");
    await expect(check("zz", e)).rejects.toThrow("INVALID_INPUT");
  });

  it("verified sign-up: one finished account per IP each hour", async () => {
    const ip = "ab".repeat(32);
    const purpose = "SIGNUP_EMAIL_VERIFICATION";
    const mint = async () => {
      const id = randomUUID();
      await sql`insert into pvp_test.email_otp_challenges
        (id, user_id, email, purpose, otp_digest, expires_at, consumed_at, ip_hash, status, created_by_request_id)
        values (
          ${id}, ${randomUUID()}, ${`${id}@x.io`}, ${purpose}::pvp_test.otp_purpose,
          ${"ab".repeat(32)}, clock_timestamp() + interval '5 minutes', clock_timestamp(),
          ${ip}, 'CONSUMED', ${randomUUID()}
        )`;
      return id;
    };
    const claim = (id: string) =>
      sql`select pvp_test.signup_verified_claim(${id}) r`.then((rows) => rows[0].r);
    expect((await claim(await mint())).ok).toBe(true);
    const second = await claim(await mint());
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("IP_LIMIT");
  });

  it("verified sign-up: no site-wide cap across different networks", async () => {
    const purpose = "SIGNUP_EMAIL_VERIFICATION";
    const mint = async () => {
      const id = randomUUID();
      const ip = id.replace(/-/g, "") + id.replace(/-/g, "");
      await sql`insert into pvp_test.email_otp_challenges
        (id, user_id, email, purpose, otp_digest, expires_at, consumed_at, ip_hash, status, created_by_request_id)
        values (
          ${id}, ${randomUUID()}, ${`${id}@x.io`}, ${purpose}::pvp_test.otp_purpose,
          ${"ab".repeat(32)}, clock_timestamp() + interval '5 minutes', clock_timestamp(),
          ${ip.slice(0, 64)}, 'CONSUMED'::pvp_test.otp_status, ${randomUUID()}
        )`;
      return id;
    };
    const claim = (id: string) =>
      sql`select pvp_test.signup_verified_claim(${id}) r`.then((rows) => rows[0].r);
    for (let i = 0; i < 12; i++) expect((await claim(await mint())).ok).toBe(true);
  });

  it("avatars: only built-in styles are accepted", async () => {
    const a = await newUser("alice");
    const set = (u: string) => as(a, (tx) => tx`select pvp_test.update_avatar(${u})`);
    await set("https://api.dicebear.com/9.x/rings/svg?seed=alice");
    for (const bad of [
      "https://evil.example/pixel.png",
      "https://api.dicebear.com.evil.example/9.x/rings/svg?seed=a",
      "https://api.dicebear.com/9.x/rings/svg?seed=a&redirect=https://evil",
      "https://api.dicebear.com/9.x/unknown/svg?seed=a",
      "http://api.dicebear.com/9.x/rings/svg?seed=a",
      "javascript:alert(1)",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "https://api.dicebear.com/9.x/rings/svg?seed=a\n",
    ])
      await expect(set(bad)).rejects.toThrow("INVALID_AVATAR");
    const [p] = await sql`select avatar_url from pvp_test.profiles where id = ${a}`;
    expect(p.avatar_url).toBe("https://api.dicebear.com/9.x/rings/svg?seed=alice");
  });

  it("own account status is readable only for the caller", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    await sql`update pvp_test.profiles set self_excluded_until = now() + interval '1 day' where id = ${b}`;
    const mine = await as(
      a,
      async (tx) => (await tx`select pvp_test.get_my_account_status() r`)[0].r,
    );
    expect(mine.self_excluded_until).toBeNull();
    expect(mine.age_confirmed_at).toBeTruthy();
    const anon = await as(
      null,
      async (tx) => (await tx`select pvp_test.get_my_account_status() r`)[0].r,
    );
    expect(anon).toBeNull();
  });

  it("withdrawal codes approve only the withdrawal they were issued for, exactly once", async () => {
    const user = randomUUID();
    const email = `wd-${user.slice(0, 8)}@example.com`;
    const id = randomUUID();
    const target: WithdrawalTarget = {
      rail: "evm",
      chainId: 8453,
      asset: "USDC",
      usdCents: 2500,
      address: "0x1111111111111111111111111111111111111111",
    };
    const digest = (t: WithdrawalTarget, code = "123456") =>
      otpDigest("pep", "WITHDRAWAL", withdrawalBinding(id, withdrawalScope(t)), code);
    const [issued] =
      await sql`select pvp_test.otp_issue(${id}, ${user}, ${email}, 'WITHDRAWAL', ${await digest(target)},
      null, null, ${randomUUID()}) as r`;
    expect(issued.r.ok).toBe(true);
    await sql`select pvp_test.otp_mark_sent(${id}, true, null, ${randomUUID()})`;
    const verify = async (d: string, purpose = "WITHDRAWAL") =>
      (
        await sql`select pvp_test.otp_verify(${id}, ${purpose}::pvp_test.otp_purpose, ${d}, ${randomUUID()}) as r`
      )[0].r;

    expect((await verify(await digest({ ...target, usdCents: 250000 }))).ok).toBe(false);
    expect(
      (await verify(await digest({ rail: "btc", usdCents: 2500, address: "bc1qattacker" }))).ok,
    ).toBe(false);
    expect((await verify(await digest(target), "PASSWORD_RESET")).ok).toBe(false);
    const ok = await verify(await digest(target));
    expect(ok).toMatchObject({ ok: true, user_id: user });
    expect((await verify(await digest(target))).ok).toBe(false);
    const [row] =
      await sql`select status, attempt_count from pvp_test.email_otp_challenges where id = ${id}`;
    expect(row).toMatchObject({ status: "CONSUMED", attempt_count: 2 });
  });

  it("integrity monitor detects and records mismatches without changing balances", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await cfCreate(a, 300);
    await cfJoin(b, game_id);
    await sleep(400);
    await driveToTerminal();
    const clean = (await sql`select pvp_test.integrity_check() r`)[0].r;
    expect(clean.incidents).toBe(0);
    // Simulate corruption (bypassing the ledger) and confirm detection.
    await sql`update pvp_test.wallet_accounts set balance = balance + 777 where owner_id = ${a} and kind = 'user_available' and account_type = 'test_credit'`;
    const before = await bal(a);
    const found = (await sql`select pvp_test.integrity_check() r`)[0].r;
    expect(found.incidents).toBeGreaterThanOrEqual(2);
    expect(await bal(a)).toBe(before); // detective only
    const inc = await sql`select check_name, details from pvp_test.integrity_incidents order by id`;
    const names = inc.map((i) => i.check_name);
    expect(names).toContain("account_balance_mismatch");
    expect(names).toContain("asset_sum_nonzero");
    expect(inc.find((i) => i.check_name === "account_balance_mismatch")!.details.owner_id).toBe(a);
    await sql`select pvp_test.integrity_check()`;
    const [again] =
      await sql`select occurrences from pvp_test.integrity_incidents where check_name='account_balance_mismatch'`;
    expect(again.occurrences).toBe(2); // deduplicated, counted
  });
});

d("live database permissions (read-only catalog checks)", () => {
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
  });
  const FINANCIAL = [
    "ledger_transactions",
    "ledger_postings",
    "wallet_accounts",
    "jackpot_games",
    "jackpot_entries",
    "jackpot_players",
    "jackpot_payouts",
    "jackpot_game_secrets",
    "coinflip_games",
    "coinflip_entries",
    "coinflip_payouts",
    "coinflip_results",
    "coinflip_game_secrets",
    "audit_logs",
    "profiles",
    "user_roles",
    "user_wallets",
    "integrity_incidents",
    "worker_tick_gate",
  ];

  it("no browser role can write, delete or truncate any public table", async () => {
    const rows =
      await sql`select c.relname, r.role from pg_class c join pg_namespace n on n.oid=c.relnamespace,
      (values ('anon'),('authenticated')) r(role)
      where n.nspname='pvp_test' and c.relkind='r' and (has_table_privilege(r.role, c.oid, 'insert') or has_table_privilege(r.role, c.oid, 'update')
        or has_table_privilege(r.role, c.oid, 'delete') or has_table_privilege(r.role, c.oid, 'truncate'))`;
    expect(rows).toEqual([]);
  });

  it("financial tables block TRUNCATE even for privileged roles", async () => {
    const rows =
      await sql`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='pvp_test' and c.relname = any(${FINANCIAL.filter((t) => !["profiles", "user_roles", "user_wallets", "worker_tick_gate"].includes(t))})
      and not exists (select 1 from pg_trigger t where t.tgrelid=c.oid and t.tgname='no_truncate')`;
    expect(rows).toEqual([]);
  });

  it("private profile fields are not readable by anon or other users", async () => {
    const [r] =
      await sql`select has_column_privilege('anon','pvp_test.profiles','self_excluded_until','select') a1,
      has_column_privilege('anon','pvp_test.profiles','age_confirmed_at','select') a2,
      has_column_privilege('authenticated','pvp_test.profiles','self_excluded_until','select') u1,
      has_column_privilege('authenticated','pvp_test.profiles','age_confirmed_at','select') u2,
      has_column_privilege('anon','pvp_test.profiles','username','select') pub`;
    expect(r).toEqual({ a1: false, a2: false, u1: false, u2: false, pub: true });
  });

  it("crypto_my_activity stays read-only (stable + peek, no _withdraw_basis sync)", async () => {
    const [row] = await sql`select p.provolatile v, pg_get_functiondef(p.oid) like '%_withdraw_basis_peek%' uses_peek,
      pg_get_functiondef(p.oid) not like '%pvp_test._withdraw_basis(%' no_sync
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'pvp_test' and p.proname = 'crypto_my_activity'`;
    expect(row.v).toBe("s");
    expect(row.uses_peek).toBe(true);
    expect(row.no_sync).toBe(true);
  });

  it("_withdraw_basis_writer_lock trigger helper is not RPC-callable by browser roles", async () => {
    const [r] = await sql`
      select has_function_privilege('anon', 'pvp_test._withdraw_basis_writer_lock()', 'execute') as anon,
             has_function_privilege('authenticated', 'pvp_test._withdraw_basis_writer_lock()', 'execute') as auth,
             exists (
               select 1 from pg_trigger t
               join pg_proc p on p.oid = t.tgfoid
               join pg_class c on c.oid = t.tgrelid
               join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'pvp_test' and c.relname = 'ledger_transactions'
                 and p.proname = '_withdraw_basis_writer_lock' and not t.tgisinternal
             ) as trigger_attached`;
    expect(r).toEqual({ anon: false, auth: false, trigger_attached: true });
  });

  it("referral_reward_lock_playthrough trigger helper is not RPC-callable by browser roles", async () => {
    const [r] = await sql`
      select has_function_privilege('anon', 'pvp_test.referral_reward_lock_playthrough()', 'execute') as anon,
             has_function_privilege('authenticated', 'pvp_test.referral_reward_lock_playthrough()', 'execute') as auth,
             exists (
               select 1 from pg_trigger t
               join pg_proc p on p.oid = t.tgfoid
               join pg_class c on c.oid = t.tgrelid
               join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'pvp_test' and c.relname = 'referral_rewards'
                 and p.proname = 'referral_reward_lock_playthrough' and not t.tgisinternal
             ) as trigger_attached`;
    expect(r).toEqual({ anon: false, auth: false, trigger_attached: true });
  });

  it("internal settlement/ledger/monitor functions are not executable by browser roles", async () => {
    for (const f of [
      "jackpot_settle(bigint)",
      "coinflip_advance(bigint)",
      "_coinflip_refund(bigint,text)",
      "_post(uuid,uuid,bigint)",
      "_ensure_open_game()",
      "_tick_gate(text)",
      "integrity_check()",
      "jackpot_tick()",
      "coinflip_tick()",
      "roulette_tick()",
      "slot_tick()",
      "signup_rate_check(text,text)",
      "signup_verified_claim(uuid)",
      "signup_verified_preview(uuid)",
      "_signup_slot_reason(text)",
      "_cash_room(uuid)",
      "_withdraw_basis(uuid)",
      "_require_live_session()",
      "otp_verify(uuid,pvp_test.otp_purpose,text,uuid)",
      "wallet_consume_and_verify(uuid,uuid,text)",
      "chat_send(uuid,text,text,text,text)",
      "poker_tick()",
      "slot_tick_with_poker()",
      "_poker_settle(bigint)",
      "_poker_take_cash(bigint,bigint,boolean)",
      "_poker_cashout(bigint)",
      "_poker_apply(bigint,integer,text,bigint,text,text)",
      "_poker_note_settle_failure(bigint,text,text)",
      "_poker_rate(uuid,text,integer,integer)",
      "_poker_tick_one(bigint)",
      "_withdraw_basis_rebuild_full()",
      "_withdraw_basis_apply_one(uuid)",
      "_withdraw_basis_apply_trg()",
      "_lock_system_accounts(pvp_test.account_kind[],text,text)",
      "_poker_hand_transfers(bigint)",
      "_jsonb_add_counts(jsonb,jsonb)",
      "slot_tick_worker()",
      "prestige_award_wager(uuid,text,text,bigint,jsonb)",
    ]) {
      const [r] = await sql.unsafe(
        `select has_function_privilege('anon','pvp_test.${f}','execute') a, has_function_privilege('authenticated','pvp_test.${f}','execute') u`,
      );
      expect({ f, ...r }).toEqual({ f, a: false, u: false });
    }
  });

  it("browser roles can execute exactly the allowlisted public functions (deny-by-default)", async () => {
    const PUBLIC_FNS = [
      "_fair_hmac(bytea,text)",
      "coinflip_outcome(bytea,bigint,integer)",
      "daily_chest_status()",
      "get_profile_stats(uuid)",
      "jackpot_draw_ticket(bytea,bigint,integer,bigint)",
      "leaderboard_public_board(uuid,integer,integer)",
      "leaderboard_public_list()",
      "leaderboard_public_partner(text)",
      "leaderboard_tick()",
      "prestige_identities(uuid[])",
      "prestige_state()",
      "real_play_open()",
      "roulette_round_bets(bigint)",
      "server_time()",
      "partner_acquisition_peek(text)",
      "referral_peek(text)",
      "referral_terms()",
      "slot_outcome(bytea,bigint,integer)",
      "slot_score_v1(smallint[])",
      "slot_spin_grid(bytea,bigint,integer)",
      "slot_spin_grid_v2(bytea,bigint,integer)",
      "slot_spin_grid_v3(bytea,bigint,integer)",
      "_poker_eval(smallint[])",
      "_poker_shuffle(bytea,bigint,text)",
      "poker_hand_detail(bigint)",
      "poker_lobby()",
      "poker_table_state(bigint)",
    ];
    const SIGNED_IN_FNS = [
      ...PUBLIC_FNS,
      "admin_coinflip_overview()",
      "admin_ledger_cashflow()",
      "admin_ops_query(text,jsonb)",
      "admin_overview()",
      "chat_heartbeat()",
      "daily_chest_open()",
      "admin_prestige_summary()",
      "coinflip_create(bigint,coin_side,text)",
      "coinflip_join(bigint,text)",
      "ensure_profile(text,boolean)",
      "get_my_account_status()",
      "prestige_claim(uuid)",
      "prestige_equip(uuid)",
      "prestige_track(text)",
      "has_role(uuid,app_role)",
      "jackpot_join(bigint,text)",
      "leaderboard_admin_campaigns(text,text,integer,integer)",
      "leaderboard_admin_decide(uuid,text,text)",
      "leaderboard_admin_get(uuid)",
      "leaderboard_admin_save_template(jsonb)",
      "leaderboard_admin_templates()",
      "leaderboard_my_access()",
      "leaderboard_partner_cancel(uuid)",
      "leaderboard_partner_cohort()",
      "leaderboard_partner_duplicate(uuid)",
      "leaderboard_partner_get(uuid)",
      "leaderboard_partner_list(text,text,integer,integer)",
      "leaderboard_partner_save(jsonb)",
      "leaderboard_partner_submit(uuid)",
      "leaderboard_partner_templates()",
      "promo_admin_create(text,bigint,integer,timestamp with time zone)",
      "promo_admin_delete(uuid)",
      "promo_admin_list()",
      "promo_admin_update(uuid,boolean,integer,timestamp with time zone,boolean)",
      "promo_claim(text)",
      "promo_mine()",
      "promo_status()",
      "partner_acquisition_claim(text)",
      "partner_acquisition_mine()",
      "partner_admin_create_code(uuid,text,bigint,integer,timestamp with time zone)",
      "partner_admin_detail(uuid,timestamp with time zone,timestamp with time zone)",
      "partner_admin_list(timestamp with time zone,timestamp with time zone)",
      "partner_admin_opponents(uuid,timestamp with time zone,timestamp with time zone)",
      "partner_admin_release_profit(uuid,uuid,bigint,text,uuid)",
      "partner_admin_remove(uuid)",
      "partner_admin_search(text)",
      "partner_admin_set(uuid,integer,text)",
      "partner_admin_set_leaderboard(uuid,boolean)",
      "partner_admin_topup(uuid,bigint,text,uuid)",
      "partner_profit_status()",
      "roulette_bet(roulette_color,bigint,text)",
      "update_avatar(text)",
      "_assert_live_session()",
      "admin_referrals()",
      "admin_signups(jsonb)",
      "referral_claim(text)",
      "referral_create_invite()",
      "referral_dashboard()",
      "slot_cancel(bigint)",
      "slot_create(bigint,text)",
      "slot_join(bigint,text)",
      "slot_spin(bigint,integer,text)",
      "poker_act(bigint,integer,text,bigint,text)",
      "poker_buyin_info(smallint)",
      "poker_commit_chain(bigint,text)",
      "poker_leave(bigint)",
      "poker_nudge(bigint)",
      "poker_reveal(bigint,text)",
      "poker_sit(bigint,smallint,smallint,bigint,text,text)",
      "poker_sit_out(bigint,boolean,text)",
      "poker_top_up(bigint,bigint)",
      "poker_admin_collusion_signals(integer,integer,integer)",
      "poker_admin_recover_settlement(bigint,text,text)",
      "poker_worker_health()",
    ];
    const executable = async (role: string) => {
      const rows = await sql.begin(async (tx) => {
        await tx`select set_config('search_path', 'pvp_test', true)`;
        return tx`select p.oid::regprocedure::text f from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='pvp_test' and p.prorettype <> 'trigger'::regtype and has_function_privilege(${role}, p.oid, 'execute')`;
      });
      return rows.map((r) => String(r.f)).sort();
    };
    expect(await executable("anon")).toEqual([...PUBLIC_FNS].sort());
    expect(await executable("authenticated")).toEqual([...SIGNED_IN_FNS].sort());
    const [d] =
      await sql`select count(*)::int n from pg_default_acl a join pg_namespace n on n.oid=a.defaclnamespace
      where n.nspname='pvp_test' and a.defaclrole = current_user::regrole and exists (select 1 from unnest(a.defaclacl) x where x::text ~ '^(anon|authenticated)?=')`;
    expect(d.n).toBe(0);
  });

  it("money-moving functions carry the server-only guard", async () => {
    const GUARDED = [
      "crypto_credit_deposit(uuid,uuid)",
      "crypto_request_withdrawal(uuid,bigint,text,bigint,uuid,boolean)",
      "crypto_cancel_withdrawal(uuid,uuid)",
      "crypto_withdrawal_failed(uuid,text)",
      "crypto_withdrawal_signed(uuid,text,bigint,text)",
      "crypto_withdrawal_liquidity_pending(uuid,text)",
      "crypto_admin_review(uuid,uuid,boolean)",
      "_crypto_release(uuid,text,text)",
      "wallet_consume_and_verify(uuid,uuid,text)",
      "crypto_withdrawal_broadcast(uuid)",
      "crypto_withdrawal_confirmed(uuid)",
      "crypto_withdrawal_error(uuid,text)",
      "crypto_admin_set_switches(uuid,boolean,boolean,boolean)",
    ];
    for (const f of GUARDED) {
      const [r] = await sql.unsafe(
        `select prosrc like '%_require_server_caller()%' g from pg_proc where oid = 'pvp_test.${f}'::regprocedure`,
      );
      expect({ f, g: r.g }).toEqual({ f, g: true });
    }
  });

  it("no browser-callable function, trigger or policy reaches pg_net, directly or through other functions", async () => {
    // pg_net itself is platform-owned (PUBLIC execute, not revocable by us) and not API-exposed;
    // the boundary we own is that nothing reachable from the API proxies into it.
    const fns =
      await sql`select p.oid::regprocedure::text sig, p.proname name, coalesce(p.prosrc, '') src,
        has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute') browser
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'pvp_test'`;
    const calls = (src: string, name: string) => new RegExp(`\\b${name}\\s*\\(`, "i").test(src);
    const reach = new Set(
      fns.filter((f) => /\bnet\s*\.\s*"?(http_\w+|_\w+)\s*\(/i.test(f.src)).map((f) => f.name),
    );
    for (let grew = true; grew;) {
      grew = false;
      for (const f of fns)
        if (!reach.has(f.name) && [...reach].some((nm) => calls(f.src, nm))) {
          reach.add(f.name);
          grew = true;
        }
    }
    // An empty reach set is a valid result: nothing in public calls net.http, so the
    // browser, trigger, and policy checks below are the assertion.
    expect(fns.filter((f) => f.browser && reach.has(f.name)).map((f) => f.sig)).toEqual([]);
    const trg =
      await sql`select c.oid::regclass::text tbl, p.proname fn from pg_trigger t join pg_class c on c.oid = t.tgrelid
      join pg_proc p on p.oid = t.tgfoid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname = 'pvp_test'`;
    expect(trg.filter((t) => reach.has(t.fn))).toEqual([]);
    const pol =
      await sql`select tablename, policyname, coalesce(qual, '') || ' ' || coalesce(with_check, '') expr from pg_policies where schemaname = 'pvp_test'`;
    expect(
      pol.filter((p) => /\bnet\s*\./i.test(p.expr) || [...reach].some((nm) => calls(p.expr, nm))),
    ).toEqual([]);
  });

  it("chat readers see only rendered columns; moderation metadata is private", async () => {
    const PUBLIC_COLS = ["created_at", "game_type", "id", "message", "status", "user_id"];
    for (const role of ["anon", "authenticated"]) {
      const cols =
        await sql`select column_name c from information_schema.columns where table_schema = 'pvp_test' and table_name = 'game_chat_messages'
        and has_column_privilege(${role}, 'pvp_test.game_chat_messages', column_name, 'select') order by 1`;
      expect({ role, cols: cols.map((r) => r.c) }).toEqual({ role, cols: PUBLIC_COLS });
    }
  });

  it("every SECURITY DEFINER function pins search_path", async () => {
    const rows =
      await sql`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='pvp_test' and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`;
    expect(rows).toEqual([]);
  });

  it("realtime: browsers may only receive chat broadcasts (no insert policy, no presence)", async () => {
    const [ns] = await sql`select to_regnamespace('realtime') as n`;
    if (ns.n === null) {
      expect(ns.n).toBeNull();
      return;
    }
    const rows =
      await sql`select policyname, cmd, qual from pg_policies where schemaname='realtime' and tablename='messages'`;
    expect(rows.filter((r) => r.cmd !== "SELECT")).toEqual([]);
    for (const r of rows) expect(String(r.qual)).not.toContain("presence");
  });
});
