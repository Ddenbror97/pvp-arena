/**
 * Security remediation suite (audit findings F-1..F-7, session lifecycle,
 * integrity monitor). Game tests run in the isolated `pvp_test` schema using
 * real concurrent Postgres transactions; permission checks read the live
 * catalog (read-only). Requires SUPABASE_DB_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 10, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const START = 100000;

type Ctx = { claims?: Record<string, unknown> };
async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>, c: Ctx = {}): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (c.claims) await tx`select set_config('request.jwt.claims', ${JSON.stringify(c.claims)}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
async function newUser(name: string) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${name}, true)`);
  return id;
}
const cfCreate = (uid: string, amount: number, c: Ctx = {}) =>
  as(uid, async (tx) => (await tx`select pvp_test.coinflip_create(${amount}, 'HEADS'::pvp_test.coin_side, ${randomUUID()}) as r`)[0].r, c);
const cfJoin = (uid: string, gid: number) => as(uid, async (tx) => (await tx`select pvp_test.coinflip_join(${gid}, ${randomUUID()}) as r`)[0].r);
const cfCancel = (uid: string, gid: number, c: Ctx = {}) => as(uid, async (tx) => (await tx`select pvp_test.coinflip_cancel(${gid}) as r`)[0].r, c);
const cfTick = (c: Ctx = {}) => as(null, async (tx) => (await tx`select pvp_test.coinflip_tick() as r`)[0].r, c);
const jpTick = (c: Ctx = {}) => as(null, async (tx) => (await tx`select pvp_test.jackpot_tick() as r`)[0].r, c);
const jpJoin = (uid: string, amount: number, c: Ctx = {}) =>
  as(uid, async (tx) => (await tx`select pvp_test.jackpot_join(${amount}, ${randomUUID()}) as r`)[0].r, c);
const cfGame = async (id: number) => (await sql`select * from pvp_test.coinflip_games where id = ${id}`)[0];
const bal = async (uid: string, kind = "user_available") =>
  Number((await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = 'test_credit'`)[0]?.balance ?? 0);

async function setCf(timeout = 60) {
  await sql`update pvp_test.coinflip_config set pre_delay_ms=100, animation_ms=150, waiting_timeout_seconds=${timeout},
    create_rate_limit=100000, max_open_per_user=100000`;
}

/** Financial invariants for every coinflip game plus the global ledger. */
async function assertCoinflipInvariants() {
  const [s] = await sql`select coalesce(sum(balance),0)::bigint s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  const neg = await sql`select id from pvp_test.wallet_accounts where kind <> 'test_faucet' and balance < 0`;
  expect(neg.length).toBe(0);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const orphan = await sql`select t.id from pvp_test.ledger_transactions t where not exists (select 1 from pvp_test.ledger_postings p where p.tx_id=t.id)`;
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
    if (g.status === "COMPLETED") expect([c.settles, c.wp, c.refunds, c.rp, c.entries]).toEqual([1, 1, 0, 0, 2]);
    if (g.status === "CANCELLED") expect([c.settles, c.wp, c.refunds, c.rp, c.entries]).toEqual([0, 0, 1, 1, 1]);
  }
}
async function driveToTerminal() {
  for (let i = 0; i < 40; i++) {
    await cfTick();
    const [o] = await sql`select count(*)::int c from pvp_test.coinflip_games where status not in ('COMPLETED','CANCELLED')`;
    if (o.c === 0) return;
    await sleep(100);
  }
  throw new Error("games did not reach a terminal state");
}

d("security remediation (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 60000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
  });
  beforeEach(async () => {
    await sql`truncate pvp_test.audit_logs, pvp_test.coinflip_payouts, pvp_test.coinflip_results, pvp_test.coinflip_entries,
      pvp_test.coinflip_game_secrets, pvp_test.coinflip_games, pvp_test.jackpot_payouts, pvp_test.jackpot_players, pvp_test.jackpot_entries,
      pvp_test.jackpot_game_secrets, pvp_test.jackpot_games, pvp_test.ledger_postings, pvp_test.ledger_transactions,
      pvp_test.wallet_accounts, pvp_test.profiles, pvp_test.test_auth_sessions, pvp_test.chat_presence, pvp_test.signup_attempts,
      pvp_test.integrity_incidents, pvp_test.integrity_runs restart identity cascade`;
    await sql`update pvp_test.worker_tick_gate set last_run_at = '-infinity'`;
    await setCf();
  });

  it("join vs cancel at the same instant: exactly one wins, money is exact (30 races)", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    let joins = 0, cancels = 0;
    for (let i = 0; i < 30; i++) {
      const { game_id } = await cfCreate(a, 100);
      const [c, j] = await Promise.allSettled([cfCancel(a, game_id), cfJoin(b, game_id)]);
      expect([c, j].filter((r) => r.status === "fulfilled").length).toBe(1);
      if (c.status === "fulfilled") cancels++; else joins++;
    }
    await driveToTerminal();
    expect(joins + cancels).toBe(30);
    await assertCoinflipInvariants();
    const [done] = await sql`select count(*) filter (where status='COMPLETED')::int c, count(*) filter (where status='CANCELLED')::int x from pvp_test.coinflip_games`;
    expect(done.c).toBe(joins);
    expect(done.x).toBe(cancels);
    expect((await bal(a)) + (await bal(b))).toBe(2 * START);
  }, 120000);

  it("refund vs payout at the expiry boundary: exactly one financial outcome", async () => {
    await setCf(1);
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    for (const offset of [900, 960, 1000, 1030, 1080]) {
      const { game_id } = await cfCreate(a, 200);
      const g = await cfGame(game_id);
      const wait = +g.expires_at - Date.now() - (1000 - offset);
      if (wait > 0) await sleep(wait);
      await Promise.allSettled([cfJoin(b, game_id), cfTick(), cfCancel(a, game_id), cfTick(), cfJoin(b, game_id)]);
    }
    await driveToTerminal();
    await driveToTerminal();
    await assertCoinflipInvariants();
    expect((await bal(a)) + (await bal(b))).toBe(2 * START);
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
    const [g] = await sql`select pot_amount from pvp_test.jackpot_games where status in ('WAITING','ACTIVE')`;
    expect(Number(g.pot_amount)).toBe(1000);
    const [e] = await sql`select count(*)::int c, coalesce(sum(amount),0)::int s from pvp_test.jackpot_entries`;
    expect([e.c, e.s]).toEqual([10, 1000]);
    for (const u of users) expect((await bal(u)) + (await bal(u, "user_locked"))).toBe(START);
    await expect(sql`update pvp_test.coinflip_config set max_wager = 50000001`).rejects.toThrow();
    await expect(sql`update pvp_test.jackpot_config set max_pot = 1000000000001`).rejects.toThrow();
  });

  it("public tick is gated (no pile-up, <= 1 run per 250ms); scheduler is never gated; duplicates stay single-effect", async () => {
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
    expect(jr.filter((x) => !x.throttled).length).toBeLessThanOrEqual(Math.ceil((Date.now() - t1) / 250) + 1);
    const sched = await Promise.all([cfTick(), cfTick(), cfTick()]);
    for (const s of sched) expect(s.throttled).toBeUndefined();
    // Duplicate triggering of a real settlement: exactly one payout.
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const { game_id } = await cfCreate(a, 500);
    await cfJoin(b, game_id);
    await sleep(400);
    await Promise.all([cfTick(), cfTick(), cfTick(anon), cfTick(anon), cfTick(auth)]);
    await driveToTerminal();
    await assertCoinflipInvariants();
  });

  it("session lifecycle: logout, expiry, revocation (password reset) and account switch block financial actions", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const sid = randomUUID();
    const claims = (sub: string, session = sid) => ({ claims: { role: "authenticated", sub, session_id: session } });
    await sql`insert into pvp_test.test_auth_sessions(id, user_id) values (${sid}, ${a})`;
    const { game_id } = await cfCreate(a, 100, claims(a)); // live session works
    // stale/unknown session id
    await expect(cfCreate(a, 100, claims(a, randomUUID()))).rejects.toThrow("SESSION_REVOKED");
    // switching accounts: A's session used with B's identity
    await expect(jpJoin(b, 100, claims(b))).rejects.toThrow("SESSION_REVOKED");
    // expired session
    await sql`update pvp_test.test_auth_sessions set not_after = now() - interval '1 second' where id = ${sid}`;
    await expect(cfCreate(a, 100, claims(a))).rejects.toThrow("SESSION_REVOKED");
    await expect(cfCancel(a, game_id, claims(a))).rejects.toThrow("SESSION_REVOKED");
    // logout / password reset: session row deleted
    await sql`update pvp_test.test_auth_sessions set not_after = null where id = ${sid}`;
    await sql`delete from pvp_test.test_auth_sessions where id = ${sid}`;
    await expect(cfCreate(a, 100, claims(a))).rejects.toThrow("SESSION_REVOKED");
    await expect(jpJoin(a, 100, claims(a))).rejects.toThrow("SESSION_REVOKED");
    // malformed claims
    await expect(cfCreate(a, 100, { claims: { role: "authenticated", sub: a, session_id: "not-a-uuid" } })).rejects.toThrow("SESSION_REVOKED");
    // nothing moved beyond the one legitimate wager
    expect(await bal(a)).toBe(START - 100);
    await assertCoinflipInvariants();
  });

  it("online count is server-side: one user = one, repeated heartbeats don't inflate, anonymous rejected", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    const beat = (u: string | null) => as(u, async (tx) => (await tx`select pvp_test.chat_heartbeat() as n`)[0].n);
    const many = await Promise.all(Array.from({ length: 20 }, () => beat(a)));
    expect(Math.max(...many)).toBe(1);
    expect(await beat(b)).toBe(2);
    await expect(beat(null)).rejects.toThrow("AUTH_REQUIRED");
  });

  it("sign-up limiter: bursts from one IP / one email are cut off, others unaffected", async () => {
    const h = (s: string) => sql`select encode(extensions.digest(${s}, 'sha256'), 'hex') h`.then((r) => r[0].h as string);
    const ip = await h("1.2.3.4");
    const check = (ipH: string | null, emailH: string) => sql`select pvp_test.signup_rate_check(${ipH}, ${emailH}) r`.then((r) => r[0].r);
    const burst = await Promise.all(Array.from({ length: 12 }, async (_, i) => check(ip, await h(`u${i}@x.io`))));
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
    ]) await expect(set(bad)).rejects.toThrow("INVALID_AVATAR");
    const [p] = await sql`select avatar_url from pvp_test.profiles where id = ${a}`;
    expect(p.avatar_url).toBe("https://api.dicebear.com/9.x/rings/svg?seed=alice");
  });

  it("own account status is readable only for the caller", async () => {
    const [a, b] = [await newUser("alice"), await newUser("bob")];
    await sql`update pvp_test.profiles set self_excluded_until = now() + interval '1 day' where id = ${b}`;
    const mine = await as(a, async (tx) => (await tx`select pvp_test.get_my_account_status() r`)[0].r);
    expect(mine.self_excluded_until).toBeNull();
    expect(mine.age_confirmed_at).toBeTruthy();
    const anon = await as(null, async (tx) => (await tx`select pvp_test.get_my_account_status() r`)[0].r);
    expect(anon).toBeNull();
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
    const [again] = await sql`select occurrences from pvp_test.integrity_incidents where check_name='account_balance_mismatch'`;
    expect(again.occurrences).toBe(2); // deduplicated, counted
  });
});

d("live database permissions (read-only catalog checks)", () => {
  const FINANCIAL = ["ledger_transactions", "ledger_postings", "wallet_accounts", "jackpot_games", "jackpot_entries", "jackpot_players",
    "jackpot_payouts", "jackpot_game_secrets", "coinflip_games", "coinflip_entries", "coinflip_payouts", "coinflip_results",
    "coinflip_game_secrets", "audit_logs", "profiles", "user_roles", "user_wallets", "integrity_incidents", "worker_tick_gate"];

  it("no browser role can write, delete or truncate any public table", async () => {
    const rows = await sql`select c.relname, r.role from pg_class c join pg_namespace n on n.oid=c.relnamespace,
      (values ('anon'),('authenticated')) r(role)
      where n.nspname='public' and c.relkind='r' and (has_table_privilege(r.role, c.oid, 'insert') or has_table_privilege(r.role, c.oid, 'update')
        or has_table_privilege(r.role, c.oid, 'delete') or has_table_privilege(r.role, c.oid, 'truncate'))`;
    expect(rows).toEqual([]);
  });

  it("financial tables block TRUNCATE even for privileged roles", async () => {
    const rows = await sql`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname = any(${FINANCIAL.filter((t) => !["profiles", "user_roles", "user_wallets", "worker_tick_gate"].includes(t))})
      and not exists (select 1 from pg_trigger t where t.tgrelid=c.oid and t.tgname='no_truncate')`;
    expect(rows).toEqual([]);
  });

  it("private profile fields are not readable by anon or other users", async () => {
    const [r] = await sql`select has_column_privilege('anon','public.profiles','self_excluded_until','select') a1,
      has_column_privilege('anon','public.profiles','age_confirmed_at','select') a2,
      has_column_privilege('authenticated','public.profiles','self_excluded_until','select') u1,
      has_column_privilege('authenticated','public.profiles','age_confirmed_at','select') u2,
      has_column_privilege('anon','public.profiles','username','select') pub`;
    expect(r).toEqual({ a1: false, a2: false, u1: false, u2: false, pub: true });
  });

  it("internal settlement/ledger/monitor functions are not executable by browser roles", async () => {
    for (const f of ["jackpot_settle(bigint)", "coinflip_advance(bigint)", "_coinflip_refund(bigint,text)", "_post(uuid,uuid,bigint)",
      "_ensure_open_game()", "_tick_gate(text)", "integrity_check()", "signup_rate_check(text,text)", "_require_live_session()",
      "otp_verify(uuid,otp_purpose,text,uuid)", "wallet_consume_and_verify(uuid,uuid,text)", "chat_send(uuid,text,text,text,text)"]) {
      const [r] = await sql.unsafe(`select has_function_privilege('anon','public.${f}','execute') a, has_function_privilege('authenticated','public.${f}','execute') u`);
      expect({ f, ...r }).toEqual({ f, a: false, u: false });
    }
  });

  it("every SECURITY DEFINER function pins search_path", async () => {
    const rows = await sql`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`;
    expect(rows).toEqual([]);
  });

  it("realtime: browsers may only receive chat broadcasts (no insert policy, no presence)", async () => {
    const rows = await sql`select policyname, cmd, qual from pg_policies where schemaname='realtime' and tablename='messages'`;
    expect(rows.filter((r) => r.cmd !== "SELECT")).toEqual([]);
    for (const r of rows) expect(String(r.qual)).not.toContain("presence");
  });
});
