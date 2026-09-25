/**
 * Jackpot engine integration + failure-injection + concurrency suite.
 * Runs against an isolated `pvp_test` schema built from the real migrations.
 * Requires SUPABASE_DB_URL; skipped otherwise. Any failure blocks deployment.
 */
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { drawTicket, verifyGame } from "../../src/lib/jackpot/fairness";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 10, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const START = 100000; // welcome grant, cents

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>, fail = false): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (fail) await tx`select set_config('pvp.fail_settlement', 'on', true)`;
    return fn(tx);
  }) as Promise<T>;
}

async function newUser(name: string) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${name}, true)`);
  return id;
}
const join = (uid: string | null, amount: number, key = randomUUID()) =>
  as(uid, async (tx) => (await tx`select pvp_test.jackpot_join(${amount}, ${key}) as r`)[0].r);
const tick = (fail = false) => as(null, async (tx) => (await tx`select pvp_test.jackpot_tick() as r`)[0].r, fail);
const openGame = async () => (await sql`select * from pvp_test.jackpot_games where status in ('WAITING','ACTIVE')`)[0];
const game = async (id: number) => (await sql`select * from pvp_test.jackpot_games where id = ${id}`)[0];
const bal = async (uid: string, kind = "user_available") =>
  Number((await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = 'test_credit'`)[0].balance);

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toThrow(code);
}

async function assertInvariants() {
  // Double-entry: all balances sum to zero; each cached balance equals its postings.
  const [s] = await sql`select coalesce(sum(balance),0)::bigint as s from pvp_test.wallet_accounts`;
  expect(Number(s.s)).toBe(0);
  const mism = await sql`select a.id from pvp_test.wallet_accounts a left join pvp_test.ledger_postings p on p.account_id = a.id
    group by a.id, a.balance having a.balance <> coalesce(sum(p.amount),0)`;
  expect(mism.length).toBe(0);
  const unbalanced = await sql`select tx_id from pvp_test.ledger_postings group by tx_id having sum(amount) <> 0`;
  expect(unbalanced.length).toBe(0);
  // Locked funds equal open pots; escrow is empty.
  const [l] = await sql`select coalesce(sum(balance),0)::bigint v from pvp_test.wallet_accounts where kind='user_locked'`;
  const [o] = await sql`select coalesce(sum(pot_amount),0)::bigint v from pvp_test.jackpot_games where status in ('WAITING','ACTIVE','DRAWING')`;
  expect(Number(l.v)).toBe(Number(o.v));
  const [e] = await sql`select coalesce(sum(balance),0)::bigint v from pvp_test.wallet_accounts where kind='game_escrow'`;
  expect(Number(e.v)).toBe(0);
  // Per-game ticket and pot invariants.
  for (const g of await sql`select * from pvp_test.jackpot_games`) {
    const ents = await sql`select * from pvp_test.jackpot_entries where game_id = ${g.id} order by ticket_start`;
    let cur = 0;
    for (const en of ents) { expect(Number(en.ticket_start)).toBe(cur); cur = Number(en.ticket_end); }
    expect(cur).toBe(Number(g.pot_amount));
    expect(ents.length).toBe(g.entry_count);
    const debits = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${g.id} and kind = 'jackpot_entry'`;
    expect(debits[0].c).toBe(ents.length);
    const settles = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${g.id} and kind = 'jackpot_settlement'`;
    expect(settles[0].c).toBe(g.status === "COMPLETED" ? 1 : 0);
    if (g.status === "COMPLETED") {
      const owner = ents.find((x) => Number(x.ticket_start) <= Number(g.winning_ticket) && Number(g.winning_ticket) < Number(x.ticket_end));
      expect(owner?.user_id).toBe(g.winner_id);
      const [wt] = await sql`select total_amount from pvp_test.jackpot_players where game_id=${g.id} and user_id=${g.winner_id}`;
      expect(Number(wt.total_amount)).toBe(Number(g.winner_total));
    }
  }
}

async function setTimer(countdown: number, extension: number, max: number, rate = 1000) {
  await sql`update pvp_test.jackpot_config set countdown_seconds=${countdown}, extension_seconds=${extension},
    max_duration_seconds=${max}, entry_rate_limit=${rate}`;
}

d("jackpot engine (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 60000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });
  beforeEach(async () => {
    await sql`truncate pvp_test.audit_logs, pvp_test.jackpot_payouts, pvp_test.jackpot_players, pvp_test.jackpot_entries,
      pvp_test.jackpot_game_secrets, pvp_test.jackpot_games, pvp_test.ledger_postings, pvp_test.ledger_transactions,
      pvp_test.wallet_accounts, pvp_test.profiles restart identity cascade`;
    await setTimer(60, 10, 180);
  });

  it("full lifecycle WAITING -> ACTIVE -> DRAWING -> COMPLETED with correct timer rules", async () => {
    const [a, b, c] = [await newUser("alice"), await newUser("bob"), await newUser("carol")];
    await join(a, 2500);
    let g = await openGame();
    expect(g.status).toBe("WAITING");
    expect(g.scheduled_end_at).toBeNull();

    await join(b, 5000);
    g = await openGame();
    expect(g.status).toBe("ACTIVE");
    const len = (x: typeof g) => (+x.scheduled_end_at - +x.countdown_started_at) / 1000;
    expect(len(g)).toBeCloseTo(60, 0);
    expect((+g.max_end_at - +g.countdown_started_at) / 1000).toBeCloseTo(180, 0);

    await join(a, 1000); // existing player tops up: no extension
    expect(len(await openGame())).toBeCloseTo(60, 0);
    await join(c, 1500); // new player: +10s
    g = await openGame();
    expect(len(g)).toBeCloseTo(70, 0);
    expect(g.player_count).toBe(3);
    expect(g.entry_count).toBe(4);
    expect(Number(g.pot_amount)).toBe(10000);
    expect(await bal(a)).toBe(START - 3500);
    expect(await bal(a, "user_locked")).toBe(3500);

    // Not due yet: tick is a no-op
    await tick();
    expect((await game(g.id)).status).toBe("ACTIVE");

    // Fast-forward: move the deadline into the past (test-only direct update)
    await sql`update pvp_test.jackpot_games set scheduled_end_at = clock_timestamp() - interval '1 second' where id = ${g.id}`;
    const r = await tick();
    expect(r.settled).toBe(1);
    const done = await game(g.id);
    expect(done.status).toBe("COMPLETED");
    expect(Number(done.payout_amount)).toBe(10000);
    expect(done.server_seed).toMatch(/^[0-9a-f]{64}$/);
    const winnerStart = { [a]: START - 3500, [b]: START - 5000, [c]: START - 1500 }[done.winner_id];
    expect(await bal(done.winner_id)).toBe(winnerStart + 10000);
    for (const u of [a, b, c]) expect(await bal(u, "user_locked")).toBe(0);

    // A fresh game opens and the record is independently verifiable
    expect((await openGame()).id).not.toBe(g.id);
    const ents = await sql`select user_id, ticket_start, ticket_end from pvp_test.jackpot_entries where game_id=${g.id}`;
    const v = await verifyGame(
      { ...done, id: Number(done.id), pot_amount: Number(done.pot_amount), winning_ticket: Number(done.winning_ticket) },
      ents.map((e) => ({ user_id: e.user_id, ticket_start: Number(e.ticket_start), ticket_end: Number(e.ticket_end) })),
    );
    expect(v.ok).toBe(true);
    await assertInvariants();
  });

  it("timer never exceeds 180s max duration", async () => {
    await setTimer(60, 50, 180);
    for (let i = 0; i < 6; i++) await join(await newUser(`cap${i}`), 100);
    const g = await openGame();
    expect(+g.scheduled_end_at).toBe(+g.max_end_at);
    expect((+g.scheduled_end_at - +g.countdown_started_at) / 1000).toBeCloseTo(180, 0);
  });

  it("validation: auth, min/max, insufficient balance, profile, self-exclusion", async () => {
    const a = await newUser("val_a");
    await expectErr(join(null, 500), "AUTH_REQUIRED");
    await expectErr(join(randomUUID(), 500), "PROFILE_REQUIRED");
    await expectErr(join(a, 50), "BELOW_MIN_ENTRY");
    await expectErr(join(a, 1000001), "ABOVE_MAX_ENTRY");
    await expectErr(join(a, 0), "BELOW_MIN_ENTRY");
    await expectErr(join(a, -500), "BELOW_MIN_ENTRY");
    await expectErr(join(a, START + 1), "INSUFFICIENT_BALANCE");
    await expectErr(join(a, 500, "short"), "INVALID_IDEMPOTENCY_KEY");
    await sql`update pvp_test.profiles set self_excluded_until = now() + interval '1 day' where id = ${a}`;
    await expectErr(join(a, 500), "SELF_EXCLUDED");
    expect(await bal(a)).toBe(START);
    const [n] = await sql`select count(*)::int c from pvp_test.jackpot_entries`;
    expect(n.c).toBe(0); // rejected requests roll back fully
    await assertInvariants();
  });

  it("idempotency: repeated request returns the original result and debits once", async () => {
    const a = await newUser("idem_a");
    const key = randomUUID();
    const r1 = await join(a, 700, key);
    const r2 = await join(a, 700, key);
    const r3 = await Promise.all(Array.from({ length: 8 }, () => join(a, 700, key).catch((e) => e)));
    expect(r1.duplicate).toBe(false);
    expect(r2.duplicate).toBe(true);
    expect(r2.entry_id).toBe(r1.entry_id);
    for (const x of r3) if (!(x instanceof Error)) expect(x.entry_id).toBe(r1.entry_id);
    expect(await bal(a)).toBe(START - 700);
    await assertInvariants();
  });

  it("rate limiting per user", async () => {
    await setTimer(60, 10, 180, 3);
    const a = await newUser("rate_a");
    for (let i = 0; i < 3; i++) await join(a, 100);
    await expectErr(join(a, 100), "RATE_LIMITED");
  });

  it("concurrency: 25 users joining simultaneously never corrupt pot or tickets", async () => {
    const users = await Promise.all(Array.from({ length: 25 }, (_, i) => newUser(`conc${i}`)));
    const res = await Promise.allSettled(users.flatMap((u) => [join(u, 1000), join(u, 250)]));
    expect(res.filter((r) => r.status === "rejected").length).toBe(0);
    const g = await openGame();
    expect(g.player_count).toBe(25);
    expect(g.entry_count).toBe(50);
    expect(Number(g.pot_amount)).toBe(25 * 1250);
    await assertInvariants();
  }, 30000);

  it("double spend: parallel entries cannot overdraw a balance", async () => {
    const a = await newUser("dbl_a");
    const res = await Promise.allSettled(Array.from({ length: 10 }, () => join(a, 30000)));
    const ok = res.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(3); // 3 * 300.00 <= 1000.00 < 4 * 300.00
    expect(await bal(a)).toBe(START - 3 * 30000);
    await assertInvariants();
  });

  it("join vs close race: entries at/after deadline are rejected, one settlement, invariants hold", async () => {
    await setTimer(1, 0, 1);
    const users = await Promise.all(Array.from({ length: 12 }, (_, i) => newUser(`race${i}`)));
    await join(users[0], 1000);
    await join(users[1], 1000);
    const g0 = await openGame();
    const deadline = +g0.scheduled_end_at;
    await sleep(Math.max(0, deadline - Date.now() - 150));
    const ops = [
      ...users.slice(2).map((u) => join(u, 500).then((r) => ({ r })).catch((e: Error) => ({ e: e.message }))),
      ...Array.from({ length: 10 }, (_, i) => sleep(i * 30).then(() => tick())),
    ];
    const out = await Promise.all(ops);
    await sleep(1200);
    await tick();
    const g = await game(g0.id);
    expect(g.status).toBe("COMPLETED");
    for (const x of out as { e?: string }[]) if (x && "e" in x && x.e) expect(x.e).toMatch(/GAME_CLOSED/);
    const late = await sql`select count(*)::int c from pvp_test.jackpot_entries where game_id=${g.id} and created_at >= ${g.scheduled_end_at}`;
    expect(late[0].c).toBe(0);
    // Late joiners that succeeded went into the next game, not the closed one
    await assertInvariants();
  }, 20000);

  it("duplicate workers: 15 concurrent ticks settle a game exactly once", async () => {
    const [a, b] = [await newUser("dup_a"), await newUser("dup_b")];
    await join(a, 1000);
    await join(b, 3000);
    const g = await openGame();
    await sql`update pvp_test.jackpot_games set scheduled_end_at = clock_timestamp() - interval '1 second' where id = ${g.id}`;
    const results = await Promise.all(Array.from({ length: 15 }, () => tick()));
    expect(results.reduce((s, r) => s + r.settled, 0)).toBe(1);
    expect((await game(g.id)).status).toBe("COMPLETED");
    await assertInvariants();
  });

  it("failure injection: interrupted settlement is recoverable and never marked paid", async () => {
    const [a, b] = [await newUser("fail_a"), await newUser("fail_b")];
    await join(a, 1000);
    await join(b, 1000);
    const g = await openGame();
    await sql`update pvp_test.jackpot_games set scheduled_end_at = clock_timestamp() - interval '1 second' where id = ${g.id}`;
    await tick(true);
    let st = await game(g.id);
    expect(st.status).toBe("DRAWING");
    expect(st.winner_id).toBeNull();
    expect(st.server_seed).toBeNull();
    let [p] = await sql`select * from pvp_test.jackpot_payouts where game_id = ${g.id}`;
    expect(p.status).toBe("FAILED");
    expect(p.last_error).toMatch(/INJECTED_FAILURE/);
    expect(await bal(a, "user_locked")).toBe(1000);
    // Entries are rejected while drawing, and no new game opens until settled
    await expectErr(join(a, 100), "GAME_CLOSED");
    await assertInvariants();

    // Retry after partial failure succeeds exactly once
    await tick(true);
    await tick();
    await tick();
    st = await game(g.id);
    expect(st.status).toBe("COMPLETED");
    [p] = await sql`select * from pvp_test.jackpot_payouts where game_id = ${g.id}`;
    expect(p.status).toBe("SETTLED");
    expect(p.attempts).toBe(3);
    await assertInvariants();
  });

  it("transaction rollback: an aborted transaction leaves no partial entry or debit", async () => {
    const a = await newUser("rb_a");
    await expect(
      as(a, async (tx) => {
        await tx`select pvp_test.jackpot_join(${1000}, ${randomUUID()})`;
        throw new Error("client aborted");
      }),
    ).rejects.toThrow("client aborted");
    expect(await bal(a)).toBe(START);
    const [n] = await sql`select count(*)::int c from pvp_test.jackpot_entries`;
    expect(n.c).toBe(0);
    await assertInvariants();
  });

  it("repeated payout attempts cannot pay twice; completed records are immutable", async () => {
    const [a, b] = [await newUser("pay_a"), await newUser("pay_b")];
    await join(a, 1000);
    await join(b, 1000);
    const g = await openGame();
    await sql`update pvp_test.jackpot_games set scheduled_end_at = clock_timestamp() - interval '1 second' where id = ${g.id}`;
    await tick();
    for (let i = 0; i < 5; i++) expect(await as(null, async (tx) => (await tx`select pvp_test.jackpot_settle(${g.id}) r`)[0].r)).toBe("noop");
    await expect(sql`update pvp_test.jackpot_games set winner_id = ${a} where id = ${g.id}`).rejects.toThrow(/IMMUTABLE/);
    await expect(sql`update pvp_test.jackpot_entries set amount = 1 where game_id = ${g.id}`).rejects.toThrow(/IMMUTABLE/);
    await expect(sql`delete from pvp_test.ledger_postings`).rejects.toThrow(/IMMUTABLE/);
    await expect(
      sql.begin(async (tx) => {
        const [t] = await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key) values ('refund', ${randomUUID()}) returning id`;
        const [acc] = await tx`select id from pvp_test.wallet_accounts where owner_id = ${a} and kind='user_available' and account_type='test_credit'`;
        await tx`select pvp_test._post(${t.id}, ${acc.id}, 999999)`; // unbalanced single-sided posting
      }),
    ).rejects.toThrow(/LEDGER_UNBALANCED/);
    await assertInvariants();
  });

  it("seed commitment is hidden until completion", async () => {
    const [a, b] = [await newUser("seed_a"), await newUser("seed_b")];
    await join(a, 1000);
    const g = await openGame();
    expect(g.server_seed).toBeNull();
    expect(g.server_seed_hash).toMatch(/^[0-9a-f]{64}$/);
    await expect(sql`update pvp_test.jackpot_games set server_seed = 'x' where id = ${g.id}`).rejects.toThrow();
    await join(b, 1000);
  });

  it("retired test-credit functions are not executable by browser roles", async () => {
    for (const schema of ["public", "pvp_test"]) {
      const rows = await sql`select p.oid::regprocedure::text f,
          has_function_privilege('anon', p.oid, 'execute') anon,
          has_function_privilege('authenticated', p.oid, 'execute') auth
        from pg_proc p where p.pronamespace = ${schema}::regnamespace
          and p.proname in ('claim_test_credits', 'reset_test_credits')`;
      expect(rows.length).toBe(3);
      for (const r of rows) expect({ f: r.f, anon: r.anon, auth: r.auth }).toEqual({ f: r.f, anon: false, auth: false });
    }
  });

  it("SQL draw and TypeScript verifier agree on random seeds (incl. rejection sampling)", async () => {
    const ns = [1n, 2n, 3n, 100n, 12485n, 999999937n, (1n << 62n) + 1n, 9223372036854775807n];
    let retried = 0;
    for (let i = 0; i < 80; i++) {
      const seed = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
      const n = ns[i % ns.length];
      const [row] = await sql`select (t).ticket::text, (t).counter from (select pvp_test.jackpot_draw_ticket(decode(${seed},'hex'), ${i}, 1, ${n.toString()}::bigint) t) x`;
      const ts = await drawTicket(seed, i, 1, n);
      expect(ts.ticket.toString()).toBe(row.ticket);
      expect(ts.counter).toBe(row.counter);
      if (row.counter > 0) retried++;
    }
    expect(retried).toBeGreaterThan(0); // N = 2^62+1 rejects ~25% of samples
  }, 30000);
});
