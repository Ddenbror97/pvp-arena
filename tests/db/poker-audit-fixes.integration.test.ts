/**
 * Poker audit regressions: lock order and deadlocks (F1/F2), stuck-settlement recovery
 * (F3), self-exclusion (F4), the committing worker (F5), rate limits and no-op calls
 * (F6), settlement diagnostics privacy (F8), chain reuse across open seats (F9) and
 * the zero-stack withdraw-basis stake (F10).
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { creditUserDeposit, migrateTestSchemaToReal } from "./money";
import { adminClaims, openAdminStepup } from "./admin-stepup";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 14, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
const LONG = 240_000;
const TRIALS = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows and jsonb come back untyped
type Row = Record<string, any>;
type P = { id: string; links: string[] };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chain(n = 120) {
  const l = new Array<string>(n + 1);
  l[n] = randomBytes(32).toString("hex");
  for (let k = n; k > 0; k--)
    l[k - 1] = createHash("sha256").update(Buffer.from(l[k]!, "hex")).digest("hex");
  return l;
}
const as = <T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
  fail: "on" | "late" | null = null,
) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (fail) await tx`select set_config('pvp.fail_settlement', ${fail}, true)`;
    return fn(tx);
  }) as Promise<T>;
const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "";
  } catch (e) {
    return String((e as Error).message);
  }
};
let n = 0;
async function player(dep = 100_000): Promise<P> {
  const id = randomUUID();
  await as(
    id,
    (tx) => tx`select pvp_test.ensure_profile(${`af${++n}${id.slice(0, 8)}`.slice(0, 20)}, true)`,
  );
  for (const k of ["user_available", "user_locked"])
    await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
      select ${id}::uuid, ${k}::pvp_test.account_kind, 'USD', 'real'
      where not exists (select 1 from pvp_test.wallet_accounts where owner_id = ${id}::uuid
        and kind = ${k}::pvp_test.account_kind and asset = 'USD' and account_type = 'real')`;
  if (dep > 0) await sql.begin((tx) => creditUserDeposit(tx, id, dep));
  return { id, links: chain() };
}
async function newTable(type = 1): Promise<number> {
  const r =
    await sql`insert into pvp_test.poker_tables (type_id, name, money_domain, asset, account_type,
      small_blind, big_blind, min_buy_in, max_buy_in, max_seats, fee_bps)
    select ty.id, 'audit', jc.money_domain, jc.asset, jc.account_type, ty.small_blind, ty.big_blind,
      ty.min_buy_in, ty.max_buy_in, ty.max_seats, c.fee_bps
    from pvp_test.poker_table_types ty, pvp_test.money_domain_config jc, pvp_test.poker_config c
    where ty.id = ${type} returning id`;
  return Number(r[0]!.id);
}
const sit = (p: P, table: number, buy = 500, head?: string) =>
  as(
    p.id,
    (
      tx,
    ) => tx`select pvp_test.poker_sit(${table}::bigint, null::smallint, null::smallint, ${buy}::bigint,
      ${head ?? p.links[0]!}, ${randomUUID()}) r`,
  ).then((r) => r[0]!.r as Row);
const latest = async (t: number) =>
  (
    await sql`select * from pvp_test.poker_hands where table_id = ${t} order by id desc limit 1`
  )[0] as Row | undefined;
const hand = async (id: string | number) =>
  (await sql`select * from pvp_test.poker_hands where id = ${id}::bigint`)[0]!;
async function revealAll(h: number | string, ps: P[]) {
  const rows =
    await sql`select user_id, link from pvp_test.poker_hand_players where hand_id = ${h}::bigint and reveal is null`;
  for (const r of rows) {
    const p = ps.find((x) => x.id === r.user_id)!;
    const i = p.links.indexOf(r.link);
    await as(p.id, (tx) => tx`select pvp_test.poker_reveal(${h}::bigint, ${p.links[i + 1]!})`);
  }
}
const act = (p: P, h: Row, a: string, amt = 0, fail: "on" | "late" | null = null) =>
  as(
    p.id,
    (tx) =>
      tx`select pvp_test.poker_act(${h.id}::bigint, ${h.version}::int, ${a}, ${amt}::bigint, ${randomUUID()}) r`,
    fail,
  );
const actor = async (h: Row, ps: P[]) => {
  const r = (
    await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id} and seat_no = ${h.to_act}`
  )[0]!;
  return ps.find((x) => x.id === r.user_id)!;
};
const due = (t: number) =>
  sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${t}`;
async function bettingHand(t: number, ps: P[]) {
  for (let i = 0; i < 40; i++) {
    const h = await latest(t);
    if (h?.status === "BETTING") return h;
    if (h?.status === "COMMIT") {
      await revealAll(h.id, ps);
      continue;
    }
    if (h?.next_hand_at) {
      const ms = +new Date(h.next_hand_at) - Date.now() + 50;
      if (ms > 0) await sleep(ms);
    }
    await due(t);
    await sql`select pvp_test._poker_tick_one(${t}::bigint)`;
  }
  throw new Error("NO_BETTING_HAND");
}
const deadlocks = async () => {
  await sleep(1200);
  return Number(
    (
      await sql`select pg_stat_clear_snapshot(), (select deadlocks from pg_stat_database where datname = current_database()) d`
    )[0]!.d,
  );
};
const reconcile = async () => (await sql`select pvp_test.poker_reconcile() r`)[0]!.r as Row;
/** Seats, hands and locked balances agree with the ledger; stuck hands are tested separately. */
const ledgerOk = async () => {
  const r = await reconcile();
  return r.open_seats + r.closed_seats + r.hands + r.locked_coverage === 0;
};
const stuckIds = async () =>
  ((await sql`select pvp_test.poker_worker_health() r`)[0]!.r.stuck_settlements as Row[]).map((s) =>
    String(s.hand_id),
  );
/** Ticks one table, independent of every other table left open by earlier tests. */
const tickOne = (t: number, fail: "on" | null = null) =>
  as(null, (tx) => tx`select pvp_test._poker_tick_one(${t}::bigint)`, fail);
const basisParity = async () => {
  await sql`select pvp_test._withdraw_basis_sync()`;
  await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
};
const bal = async (uid: string, kind = "user_available") =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid}::uuid and kind = ${kind}
        and asset = 'USD' and account_type = 'real'`
    )[0]?.balance ?? 0,
  );

/** A hand whose settlement failed `attempts` times through the normal retry path. */
async function failedHand(attempts: number) {
  const [u, v] = [await player(), await player()];
  const t = await newTable();
  await sit(u, t);
  await sit(v, t);
  const h = await bettingHand(t, [u, v]);
  await act(await actor(h, [u, v]), h, "FOLD", 0, "on");
  for (let i = 1; i < attempts; i++) {
    await due(t);
    await tickOne(t, "on");
  }
  return { u, v, t, id: h.id as string };
}

let admin = "";
let adminSession = "";
const asAdmin = <T>(fn: (tx: postgres.TransactionSql) => Promise<T>, fail: "on" | null = null) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${admin}, true),
      set_config('request.jwt.claims', ${adminClaims(admin, adminSession)}, true)`;
    if (fail) await tx`select set_config('pvp.fail_settlement', ${fail}, true)`;
    return fn(tx);
  }) as Promise<T>;
const recover = (
  id: string,
  mode: string,
  reason = "operator recovery test",
  fail: "on" | null = null,
) =>
  asAdmin(
    (tx) => tx`select pvp_test.poker_admin_recover_settlement(${id}::bigint, ${mode}, ${reason}) r`,
    fail,
  ).then((r) => r[0]!.r as Row);

d("poker audit fixes", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    for (const k of ["game_escrow", "house_revenue", "house_bankroll"])
      await sql`select pvp_test._system_account(${k}::pvp_test.account_kind, 'USD', 'real')`;
    await sql`update pvp_test.poker_config set enabled = true, reveal_seconds = 5, action_seconds = 20,
      showdown_seconds = 1, between_hands_seconds = 1, runout_street_seconds = 0, max_active_tables = 500`;
    await sql`grant usage on schema pvp_test to anon, authenticated`;
    await sql`grant execute on function pvp_test.test_uid() to anon, authenticated`;
    admin = (await player(0)).id;
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}::uuid, 'admin'::pvp_test.app_role)`;
    adminSession = await openAdminStepup(sql, admin);
  }, 600_000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it(
    "F1/F2: settlement waits for a held wallet instead of deadlocking with a buy-in",
    async () => {
      const d0 = await deadlocks();
      for (let k = 0; k < TRIALS; k++) {
        const [u, v] = [await player(), await player()];
        const t = await newTable();
        await sit(u, t);
        await sit(v, t);
        const h = await bettingHand(t, [u, v]);
        const who = await actor(h, [u, v]);
        // The buy-in path's order: wallet first, then the withdraw-basis lock.
        const b = await sql.reserve();
        await b`begin`;
        await b`select pvp_test._coinflip_lock_wallets(array[${u.id}]::uuid[], 'USD', 'real')`;
        const settle = act(who, h, "FOLD").then(
          () => "ok",
          (e) => (e as Error).message,
        );
        await sleep(150);
        const buyIn = await b`select pvp_test._withdraw_basis_sync()`.then(
          () => "ok",
          (e) => (e as Error).message,
        );
        await b`rollback`;
        b.release();
        expect([buyIn, await settle]).toEqual(["ok", "ok"]);
        const done = await hand(h.id);
        expect([done.status, done.settle_attempts]).toEqual(["COMPLETED", 0]);
      }
      expect((await deadlocks()) - d0).toBe(0);
      expect((await reconcile()).ok).toBe(true);
      await basisParity();
    },
    LONG,
  );

  it(
    "F1/F2: concurrent settlement and a top-up by the same player on another table",
    async () => {
      const d0 = await deadlocks();
      for (let k = 0; k < TRIALS; k++) {
        const [u, v, w] = [await player(), await player(), await player()];
        const [t1, t2] = [await newTable(), await newTable()];
        await sit(u, t1);
        await sit(v, t1);
        await sit(u, t2, 200, chain()[0]);
        await sit(w, t2);
        const h = await bettingHand(t1, [u, v]);
        const who = await actor(h, [u, v]);
        const res = await Promise.all([
          err(act(who, h, "FOLD")),
          err(as(u.id, (tx) => tx`select pvp_test.poker_top_up(${t2}::bigint, 100::bigint)`)),
        ]);
        expect(res).toEqual(["", ""]);
        expect((await hand(h.id)).status).toBe("COMPLETED");
      }
      expect((await deadlocks()) - d0).toBe(0);
      expect((await reconcile()).ok).toBe(true);
      await basisParity();
    },
    LONG,
  );

  it(
    "F1/F2: one player's settlements on three tables race their deposits and cash-outs",
    async () => {
      const d0 = await deadlocks();
      for (let k = 0; k < TRIALS; k++) {
        const u = await player(200_000);
        // One chain per table, as the client does.
        const us = [0, 1, 2].map(() => ({ id: u.id, links: chain() }));
        const others = [await player(), await player(), await player()];
        const tables = [await newTable(), await newTable(), await newTable()];
        for (let i = 0; i < 3; i++) {
          await sit(us[i]!, tables[i]!);
          await sit(others[i]!, tables[i]!);
        }
        const hands = await Promise.all(tables.map((t, i) => bettingHand(t, [us[i]!, others[i]!])));
        const actors = await Promise.all(hands.map((h, i) => actor(h, [us[i]!, others[i]!])));
        const res = await Promise.all([
          ...hands.map((h, i) => err(act(actors[i]!, h, "FOLD"))),
          err(sql.begin((tx) => creditUserDeposit(tx, u.id, 1000))),
          err(sql.begin((tx) => creditUserDeposit(tx, others[0]!.id, 1000))),
          err(sql`select pvp_test._withdraw_basis_sync()`),
        ]);
        expect(res).toEqual(res.map(() => ""));
        for (const h of hands) {
          const s = await hand(h.id);
          expect([s.status, s.last_error]).toEqual(["COMPLETED", null]);
        }
        await Promise.all(
          tables.map((t, i) =>
            err(
              as(
                (i === 0 ? u : others[i]!).id,
                (tx) => tx`select pvp_test.poker_leave(${t}::bigint)`,
              ),
            ),
          ),
        ).then((r) => expect(r.every((x) => x === "")).toBe(true));
      }
      expect((await deadlocks()) - d0).toBe(0);
      expect((await reconcile()).ok).toBe(true);
      await basisParity();
    },
    LONG,
  );

  it(
    "F1/F3: a completed hand settles once; retries and recovery calls are no-ops",
    async () => {
      const [u, v] = [await player(), await player()];
      const t = await newTable();
      await sit(u, t);
      await sit(v, t);
      const h = await bettingHand(t, [u, v]);
      await act(await actor(h, [u, v]), h, "FOLD");
      await sql`select pvp_test._poker_settle(${h.id}::bigint)`;
      expect(await recover(h.id, "retry")).toMatchObject({ ok: true, already: "COMPLETED" });
      expect(await recover(h.id, "refund")).toMatchObject({ ok: true, already: "COMPLETED" });
      const txs =
        await sql`select count(*)::int c from pvp_test.ledger_transactions where idempotency_key = ${`poker:hand:${h.id}:settle`}`;
      expect(txs[0]!.c).toBe(1);
    },
    LONG,
  );

  it(
    "F3: a failure after the postings rolls back the whole settlement",
    async () => {
      const [u, v] = [await player(), await player()];
      const t = await newTable();
      await sit(u, t);
      await sit(v, t);
      const h = await bettingHand(t, [u, v]);
      const before = [await bal(u.id, "user_locked"), await bal(v.id, "user_locked")];
      await act(await actor(h, [u, v]), h, "FOLD", 0, "late");
      const after = await hand(h.id);
      expect([after.status, after.settle_attempts, after.ledger_tx_id]).toEqual([
        "SETTLEMENT",
        1,
        null,
      ]);
      expect(after.last_error).toContain("INJECTED_LATE_FAILURE");
      const txs =
        await sql`select count(*)::int c from pvp_test.ledger_transactions where idempotency_key = ${`poker:hand:${h.id}:settle`}`;
      expect(txs[0]!.c).toBe(0);
      expect([await bal(u.id, "user_locked"), await bal(v.id, "user_locked")]).toEqual(before);
      await due(t);
      await tickOne(t);
      expect((await hand(h.id)).status).toBe("COMPLETED");
      expect(await ledgerOk()).toBe(true);
    },
    LONG,
  );

  it(
    "F3: eight failures stop automatic retries, raise one incident and show in health",
    async () => {
      const { t, id } = await failedHand(8);
      const h = await hand(id);
      expect([h.status, h.settle_attempts]).toEqual(["SETTLEMENT", 8]);
      const table = (await sql`select next_due_at from pvp_test.poker_tables where id = ${t}`)[0]!;
      expect(table.next_due_at).toBeNull();
      for (let i = 0; i < 3; i++) {
        await due(t);
        await tickOne(t, "on");
        await as(null, (tx) => tx`select pvp_test.poker_tick()`, "on");
      }
      expect((await hand(id)).settle_attempts).toBe(8);
      const failures =
        await sql`select attempt, source from pvp_test.poker_settlement_failures where hand_id = ${id}::bigint order by id`;
      expect(failures.map((f) => f.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      const inc =
        await sql`select occurrences from pvp_test.integrity_incidents where fingerprint = ${`pks:${id}`}`;
      expect(inc.map((r) => r.occurrences)).toEqual([1]);
      const rec = await reconcile();
      expect(rec.ok).toBe(false);
      expect(rec.stuck_settlements).toBeGreaterThanOrEqual(1);
      const health = (await sql`select pvp_test.poker_worker_health() r`)[0]!.r;
      expect(health.stuck_settlements.map((s: Row) => String(s.hand_id))).toContain(String(id));
    },
    LONG,
  );

  it(
    "F3: an admin retry settles a stuck hand exactly once",
    async () => {
      const { u, v, t, id } = await failedHand(8);
      const stranger = await player(0);
      expect(
        await err(
          as(
            stranger.id,
            (tx) =>
              tx`select pvp_test.poker_admin_recover_settlement(${id}::bigint, 'retry', 'not mine')`,
          ),
        ),
      ).toContain("FORBIDDEN");
      expect(await err(recover(id, "retry", "x"))).toContain("REASON_REQUIRED");
      expect(await err(recover(id, "void", "operator test"))).toContain("INVALID_MODE");
      const failed = await recover(id, "retry", "operator recovery test", "on");
      expect(failed).toMatchObject({ ok: false, attempts: 9 });
      const src =
        await sql`select source from pvp_test.poker_settlement_failures where hand_id = ${id}::bigint and attempt = 9`;
      expect(src[0]!.source).toBe("admin_retry");
      expect(await recover(id, "retry")).toMatchObject({ ok: true, result: "settled" });
      expect(await recover(id, "retry")).toMatchObject({ ok: true, already: "COMPLETED" });
      expect((await hand(id)).status).toBe("COMPLETED");
      const audit =
        await sql`select count(*)::int c from pvp_test.audit_logs where action = 'poker_settle_recovered' and game_id = ${id}::bigint`;
      expect(audit[0]!.c).toBe(1);
      for (const p of [u, v]) await as(p.id, (tx) => tx`select pvp_test.poker_leave(${t}::bigint)`);
      expect(await stuckIds()).not.toContain(String(id));
      expect(await ledgerOk()).toBe(true);
      await basisParity();
    },
    LONG,
  );

  it(
    "F3: an admin refund voids a stuck hand and returns every contribution",
    async () => {
      const { u, v, t, id } = await failedHand(8);
      const seats =
        await sql`select hp.user_id, hp.start_stack, s.stack from pvp_test.poker_hand_players hp
          join pvp_test.poker_seats s on s.id = hp.seat_id where hp.hand_id = ${id}::bigint`;
      expect(seats.every((s) => +s.stack === +s.start_stack)).toBe(true);
      expect(
        await err(sql`update pvp_test.poker_hands set status = 'VOIDED' where id = ${id}::bigint`),
      ).toContain("ILLEGAL_TRANSITION");
      expect(await recover(id, "refund")).toMatchObject({ ok: true, result: "refunded" });
      const h = await hand(id);
      expect([h.status, h.void_reason, h.ledger_tx_id]).toEqual([
        "VOIDED",
        "settlement_refund",
        null,
      ]);
      expect(h.server_seed).toMatch(/^[0-9a-f]{64}$/);
      const players =
        await sql`select total_bet, refund, won, end_stack, start_stack from pvp_test.poker_hand_players where hand_id = ${id}::bigint`;
      for (const p of players) {
        expect(+p.refund).toBe(+p.total_bet);
        expect(+p.end_stack).toBe(+p.start_stack);
        expect(+p.won).toBe(0);
      }
      expect(await recover(id, "refund")).toMatchObject({ ok: true, already: "VOIDED" });
      for (const p of [u, v]) await as(p.id, (tx) => tx`select pvp_test.poker_leave(${t}::bigint)`);
      // Deposit back in full: the hand moved no money.
      expect([await bal(u.id), await bal(v.id)]).toEqual([100_000, 100_000]);
      expect(await stuckIds()).not.toContain(String(id));
      expect(await ledgerOk()).toBe(true);
      await basisParity();
    },
    LONG,
  );

  it(
    "F4: self-exclusion blocks top-ups and sit-in, and cashes out at the next hand",
    async () => {
      const [u, v] = [await player(), await player()];
      const t = await newTable();
      await sit(u, t);
      await sit(v, t);
      const h = await bettingHand(t, [u, v]);
      await sql`update pvp_test.profiles set self_excluded_until = now() + interval '30 days' where id = ${u.id}::uuid`;
      expect(
        await err(as(u.id, (tx) => tx`select pvp_test.poker_top_up(${t}::bigint, 100::bigint)`)),
      ).toContain("SELF_EXCLUDED");
      // The running hand plays out normally.
      await act(await actor(h, [u, v]), h, "FOLD");
      expect((await hand(h.id)).status).toBe("COMPLETED");
      const stack = Number(
        (
          await sql`select stack + pending s from pvp_test.poker_seats where table_id = ${t} and user_id = ${u.id}::uuid and status = 'SEATED'`
        )[0]!.s,
      );
      await sleep(1100);
      await due(t);
      await tickOne(t);
      const seat = (
        await sql`select status, cashed_out from pvp_test.poker_seats where table_id = ${t} and user_id = ${u.id}::uuid order by id desc limit 1`
      )[0]!;
      expect([seat.status, +seat.cashed_out]).toEqual(["CLOSED", stack]);
      expect(await bal(u.id)).toBe(100_000 - 500 + stack);
      expect(
        (
          await sql`select count(*)::int c from pvp_test.poker_hand_players hp join pvp_test.poker_hands h on h.id = hp.hand_id
          where h.table_id = ${t} and h.id > ${h.id}::bigint and hp.user_id = ${u.id}::uuid`
        )[0]!.c,
      ).toBe(0);
      expect(await err(sit(u, t, 500, chain()[0]))).toContain("SELF_EXCLUDED");
      expect(await ledgerOk()).toBe(true);
    },
    LONG,
  );

  it(
    "F4: a sitting-out player who self-excludes cannot sit back in",
    async () => {
      const [u, v] = [await player(), await player()];
      const t = await newTable();
      await sit(u, t);
      await as(u.id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, true, null)`);
      await sql`update pvp_test.profiles set self_excluded_until = now() + interval '1 day' where id = ${u.id}::uuid`;
      expect(
        await err(as(u.id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, false, null)`)),
      ).toContain("SELF_EXCLUDED");
      await sit(v, t);
      const seat = (
        await sql`select status from pvp_test.poker_seats where table_id = ${t} and user_id = ${u.id}::uuid order by id desc limit 1`
      )[0]!;
      expect(seat.status).toBe("CLOSED");
      expect(await bal(u.id)).toBe(100_000);
    },
    LONG,
  );

  it(
    "F5: the worker procedure commits per table and records its metrics",
    async () => {
      const groups = [];
      for (let i = 0; i < 3; i++) {
        const ps = [await player(), await player()];
        const t = await newTable();
        for (const p of ps) await sit(p, t);
        groups.push({ t, ps });
      }
      for (const g of groups) await due(g.t);
      await sql`call pvp_test.slot_tick_worker()`;
      const st = (await sql`select * from pvp_test.poker_worker_stats`)[0]!;
      expect(st.processed + st.skipped + st.failed).toBeGreaterThanOrEqual(3);
      expect(st.budget_exhausted).toBe(false);
      const health = (await sql`select pvp_test.poker_worker_health() r`)[0]!.r;
      expect(health.age_seconds).toBeLessThan(10);
      const stranger = await player(0);
      expect(
        await err(as(stranger.id, (tx) => tx`select pvp_test.poker_worker_health()`)),
      ).toContain("FORBIDDEN");
    },
    LONG,
  );

  it(
    "F6: unchanged chain and sit-out calls do not bump the table version",
    async () => {
      const u = await player();
      const t = await newTable();
      await sit(u, t);
      const version = async () =>
        Number((await sql`select version from pvp_test.poker_tables where id = ${t}`)[0]!.version);
      const v0 = await version();
      const r = (
        await as(
          u.id,
          (tx) => tx`select pvp_test.poker_commit_chain(${t}::bigint, ${u.links[0]!}) r`,
        )
      )[0]!.r;
      expect(r).toMatchObject({ ok: true, unchanged: true });
      await as(u.id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, true, null)`);
      const v1 = await version();
      const again = (
        await as(u.id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, true, null) r`)
      )[0]!.r;
      expect(again).toMatchObject({ ok: true, unchanged: true });
      expect(await version()).toBe(v1);
      expect(v1).toBeGreaterThan(v0);
    },
    LONG,
  );

  it(
    "F6: player RPCs and buy-ins are rate limited per user",
    async () => {
      await sql`update pvp_test.poker_config set rpc_rate_limit = 5, buy_in_rate_limit = 2`;
      try {
        const u = await player();
        const t = await newTable();
        await sit(u, t);
        const results = [];
        for (let i = 0; i < 6; i++)
          results.push(
            await err(
              as(
                u.id,
                (tx) => tx`select pvp_test.poker_commit_chain(${t}::bigint, ${u.links[0]!})`,
              ),
            ),
          );
        expect(results.slice(0, 4)).toEqual(["", "", "", ""]);
        expect(results[4]).toContain("RATE_LIMITED");
        const w = await player();
        await sql`delete from pvp_test.poker_rate_limits where user_id = ${w.id}::uuid`;
        const t2 = await newTable();
        await sit(w, t2, 400);
        await as(w.id, (tx) => tx`select pvp_test.poker_top_up(${t2}::bigint, 10::bigint)`);
        expect(
          await err(as(w.id, (tx) => tx`select pvp_test.poker_top_up(${t2}::bigint, 10::bigint)`)),
        ).toContain("RATE_LIMITED");
      } finally {
        await sql`update pvp_test.poker_config set rpc_rate_limit = 40, buy_in_rate_limit = 10`;
      }
    },
    LONG,
  );

  it(
    "F7: admins see one-way chip flow between a pair; nobody else can run the report",
    async () => {
      const [u, v] = [await player(), await player()];
      const t = await newTable();
      await sit(u, t);
      await sit(v, t);
      // u folds to v every hand: the chip-dumping shape.
      for (let i = 0; i < 3; i++) {
        let h = await bettingHand(t, [u, v]);
        for (let k = 0; k < 4 && h.status === "BETTING"; k++) {
          const p = await actor(h, [u, v]);
          await act(p, h, p.id === u.id ? "FOLD" : "CALL");
          h = await hand(h.id);
        }
      }
      const r = (
        await asAdmin((tx) => tx`select pvp_test.poker_admin_collusion_signals(1, 2, 200) r`)
      )[0]!.r;
      const pair = (r.pairs as Row[]).find(
        (p) => [p.user_a, p.user_b].includes(u.id) && [p.user_a, p.user_b].includes(v.id),
      )!;
      expect(pair.hands).toBe(3);
      expect(pair.one_way).toBe(1);
      expect(pair.no_showdown).toBe(1);
      expect(Math.sign(pair.flow)).toBe(pair.user_a === u.id ? 1 : -1);
      expect(Object.keys(pair).some((k) => /card|email|ip/i.test(k))).toBe(false);
      expect(
        await err(as(u.id, (tx) => tx`select pvp_test.poker_admin_collusion_signals()`)),
      ).toContain("FORBIDDEN");
      const anon = await sql
        .begin(async (tx) => {
          await tx.unsafe("set local role anon");
          return tx`select pvp_test.poker_admin_collusion_signals()`;
        })
        .then(
          () => "ran",
          (e) => (e as Error).message,
        );
      expect(anon).toContain("permission denied");
    },
    LONG,
  );

  it("F8: anon and players cannot read settlement diagnostics", async () => {
    for (const role of ["anon", "authenticated"]) {
      const res = await sql
        .begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          return tx`select last_error, settle_attempts from pvp_test.poker_hands limit 1`;
        })
        .then(
          () => "readable",
          (e) => (e as Error).message,
        );
      expect(res).toContain("permission denied");
      const ok = await sql.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        return tx`select id, status, server_seed_hash, board from pvp_test.poker_hands limit 1`;
      });
      expect(Array.isArray(ok)).toBe(true);
    }
    for (const t of ["poker_settlement_failures", "poker_worker_stats", "poker_rate_limits"]) {
      const res = await sql
        .begin(async (tx) => {
          await tx.unsafe("set local role authenticated");
          return tx.unsafe(`select * from pvp_test.${t} limit 1`);
        })
        .then(
          () => "readable",
          (e) => (e as Error).message,
        );
      expect(res).toContain("permission denied");
    }
  });

  it(
    "F9: a head held by another open seat is refused, even under concurrency",
    async () => {
      const [x, y] = [await player(), await player()];
      const t = await newTable();
      await sit(x, t);
      expect(await err(sit(y, t, 500, x.links[0]))).toContain("CHAIN_REUSED");
      await sit(y, t);
      expect(
        await err(
          as(y.id, (tx) => tx`select pvp_test.poker_commit_chain(${t}::bigint, ${x.links[0]!})`),
        ),
      ).toContain("CHAIN_REUSED");
      for (let k = 0; k < 5; k++) {
        const [a, b] = [await player(), await player()];
        const [ta, tb] = [await newTable(), await newTable()];
        const head = chain(2)[0]!;
        const res = await Promise.all([err(sit(a, ta, 500, head)), err(sit(b, tb, 500, head))]);
        expect(res.filter((r) => r === "")).toHaveLength(1);
        expect(res.find((r) => r !== "")).toContain("CHAIN_REUSED");
      }
    },
    LONG,
  );

  it(
    "F10: a zero-stack cash-out releases the seat's withdraw-basis stake",
    async () => {
      const [u, v] = [await player(), await player()];
      const t = await newTable();
      await sit(u, t, 200);
      await sit(v, t, 200);
      let busted: P | null = null;
      for (let i = 0; i < 12 && !busted; i++) {
        let h = await bettingHand(t, [u, v]);
        for (let k = 0; k < 8 && h.status === "BETTING"; k++) {
          const p = await actor(h, [u, v]);
          const la = (
            await as(p.id, (tx) => tx`select pvp_test.poker_table_state(${t}::bigint) r`)
          )[0]!.r.me.legal;
          await act(p, h, la.can_raise ? "ALL_IN" : la.can_call ? "CALL" : "CHECK");
          h = await hand(h.id);
        }
        const z =
          await sql`select user_id from pvp_test.poker_seats where table_id = ${t} and status = 'SEATED' and stack + pending = 0`;
        if (z.length) busted = [u, v].find((x) => x.id === z[0]!.user_id)!;
      }
      expect(busted).not.toBeNull();
      const seat = (
        await sql`select id from pvp_test.poker_seats where table_id = ${t} and user_id = ${busted!.id}::uuid and status = 'SEATED'`
      )[0]!.id;
      await sql`select pvp_test._withdraw_basis_sync()`;
      await as(busted!.id, (tx) => tx`select pvp_test.poker_leave(${t}::bigint)`);
      await sql`select pvp_test._withdraw_basis_sync()`;
      const stake =
        await sql`select * from pvp_test.withdraw_basis_stake where user_id = ${busted!.id}::uuid and game = 'poker' and game_id = ${seat}`;
      expect(stake).toHaveLength(0);
      await basisParity();
    },
    LONG,
  );

  it(
    "table cap: only first seats at empty tables are refused, concurrently and without leftovers",
    async () => {
      const def = await sql`select column_default from information_schema.columns
        where table_schema = 'pvp_test' and table_name = 'poker_config' and column_name = 'max_active_tables'`;
      expect(def[0]!.column_default).toBe("10");
      const active = async () =>
        Number(
          (
            await sql`select count(distinct s.table_id) n from pvp_test.poker_seats s
              join pvp_test.poker_tables t on t.id = s.table_id where s.status = 'SEATED' and t.status = 'OPEN'`
          )[0]!.n,
        );
      const a0 = await active();
      await sql`update pvp_test.poker_config set max_active_tables = ${a0 + 1}`;
      try {
        const [a, b, c, e] = [await player(), await player(), await player(), await player()];
        const [t1, t2] = [await newTable(), await newTable()];
        const raced = await Promise.all([err(sit(a, t1)), err(sit(b, t2))]);
        expect(raced.filter((r) => r === "")).toHaveLength(1);
        expect(raced.filter((r) => r.includes("TABLE_CAP_REACHED"))).toHaveLength(1);
        expect(await active()).toBe(a0 + 1);
        const busy = raced[0] === "" ? t1 : t2;
        expect(await err(sit(c, busy))).toBe("");

        const tables = async () =>
          Number((await sql`select count(*) n from pvp_test.poker_tables`)[0]!.n);
        const before = await tables();
        const auto = await err(
          as(
            e.id,
            (
              tx,
            ) => tx`select pvp_test.poker_sit(null::bigint, 8::smallint, null::smallint, 40000::bigint,
              ${e.links[0]!}, ${randomUUID()})`,
          ),
        );
        expect(auto).toContain("TABLE_CAP_REACHED");
        expect(await tables()).toBe(before);
        expect(await bal(e.id)).toBe(100_000);

        await sql`update pvp_test.poker_config set max_active_tables = 1`;
        expect(await active()).toBe(a0 + 1);
        const f = await player();
        expect(await err(sit(f, busy))).toBe("");
      } finally {
        await sql`update pvp_test.poker_config set max_active_tables = 500`;
      }
      expect(await ledgerOk()).toBe(true);
    },
    LONG,
  );

  it(
    "poker_nudge: per-user nudge and shared RPC budgets, one caller does the work, failures back off",
    async () => {
      const nudge = (p: P | null, t: number, fail: "on" | null = null) =>
        as(p?.id ?? null, (tx) => tx`select pvp_test.poker_nudge(${t}::bigint) r`, fail).then(
          (r) => r[0]!.r as string,
          (e) => String((e as Error).message),
        );
      const counts = async (uid: string) =>
        Object.fromEntries(
          (
            await sql`select op, n from pvp_test.poker_rate_limits where user_id = ${uid}::uuid`
          ).map((r) => [r.op, r.n]),
        );
      expect(await nudge(null, 1)).toContain("AUTH_REQUIRED");
      await sql`update pvp_test.poker_config set nudge_rate_limit = 3, nudge_rate_window_seconds = 60`;
      try {
        const [u, v] = [await player(0), await player(0)];
        const t = await newTable();
        await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() + interval '1 hour' where id = ${t}`;
        const r: string[] = [];
        for (let i = 0; i < 4; i++) r.push(await nudge(u, t));
        expect(r.slice(0, 3)).toEqual(["not_due", "not_due", "not_due"]);
        expect(r[3]).toContain("RATE_LIMITED");
        // The refused call rolled back both increments.
        expect(await counts(u.id)).toEqual({ rpc: 3, nudge: 3 });
        expect(await nudge(v, t)).toBe("not_due");
        // Another RPC still works for u: the nudge budget is its own bucket.
        expect(
          await err(as(u.id, (tx) => tx`select pvp_test.poker_table_state(${t}::bigint)`)),
        ).toBe("");
        // An exhausted shared RPC budget refuses nudges with nudge budget left.
        await sql`update pvp_test.poker_rate_limits set n = (select rpc_rate_limit from pvp_test.poker_config)
          where user_id = ${v.id}::uuid and op = 'rpc'`;
        expect(await nudge(v, t)).toContain("RATE_LIMITED");

        // A due table: concurrent nudges from different users do its work exactly once.
        const [a, b] = [await player(), await player()];
        const t2 = await newTable();
        await sit(a, t2);
        await sit(b, t2);
        const before = Number(
          (await sql`select count(*) n from pvp_test.poker_hands where table_id = ${t2}`)[0]!.n,
        );
        await due(t2);
        const callers = await Promise.all(Array.from({ length: 8 }, () => player(0)));
        const raced = await Promise.all(callers.map((p) => nudge(p, t2)));
        expect(raced.every((x) => !/error|exception|RATE_LIMITED|AUTH/i.test(x))).toBe(true);
        expect(raced.filter((x) => x !== "not_due")).toHaveLength(1);
        const after = Number(
          (await sql`select count(*) n from pvp_test.poker_hands where table_id = ${t2}`)[0]!.n,
        );
        expect(after - before).toBeLessThanOrEqual(1);

        // A failing settlement is retried once per backoff, not on every nudge.
        const f = await failedHand(1);
        await due(f.t);
        const w = await player(0);
        await nudge(w, f.t, "on");
        const s1 = await hand(f.id);
        expect(s1.status).toBe("SETTLEMENT");
        expect(s1.settle_attempts).toBe(2);
        const nd = (await sql`select next_due_at > clock_timestamp() + interval '500 milliseconds' later
          from pvp_test.poker_tables where id = ${f.t}`)[0]!.later;
        expect(nd).toBe(true);
        expect(await nudge(w, f.t, "on")).toBe("not_due");
        expect((await hand(f.id)).settle_attempts).toBe(2);
      } finally {
        await sql`update pvp_test.poker_config set nudge_rate_limit = 20, nudge_rate_window_seconds = 10`;
      }
      expect(await ledgerOk()).toBe(true);
    },
    LONG,
  );

  it(
    "collusion signals attribute multiway and side pots per pot, conserve chips and flag unattributable hands",
    async () => {
      // Everyone shoves with distinct stacks, so hands with three or more players have side
      // pots. The first hand opens heads-up as soon as two are seated; v and x join the next.
      const [u, v, w, x] = [await player(), await player(), await player(), await player()];
      const ps = [u, v, w, x];
      const t = await newTable();
      await sit(u, t, 200);
      await sit(w, t, 350);
      await sit(v, t, 500);
      await sit(x, t, 400);
      const hands: string[] = [];
      const dealt: string[][] = [];
      const pots: number[] = [];
      const pairWithMultiway = () =>
        ps.some((a) =>
          ps.some((b) => {
            if (a.id >= b.id) return false;
            const both = dealt.filter((d) => d.includes(a.id) && d.includes(b.id));
            return both.length >= 2 && both.some((d) => d.length >= 3);
          }),
        );
      for (let i = 0; i < 8 && !(pots.some((n) => n > 1) && pairWithMultiway()); i++) {
        const low = await sql`select user_id, stack + pending s, state from pvp_test.poker_seats
          where table_id = ${t} and status = 'SEATED' and (stack + pending < 200 or state = 'SITTING_OUT')`;
        for (const r of low) {
          if (Number(r.s) < 200)
            await as(r.user_id, (tx) => tx`select pvp_test.poker_top_up(${t}::bigint, ${300 - Number(r.s)}::bigint)`);
          if (r.state === "SITTING_OUT")
            await as(r.user_id, (tx) => tx`select pvp_test.poker_sit_out(${t}::bigint, false, null)`);
        }
        let h = await bettingHand(t, ps);
        hands.push(String(h.id));
        for (let k = 0; k < 40 && h.status === "BETTING"; k++) {
          const p = await actor(h, ps);
          const la = (
            await as(p.id, (tx) => tx`select pvp_test.poker_table_state(${t}::bigint) r`)
          )[0]!.r.me.legal;
          await act(p, h, la.can_raise ? "ALL_IN" : la.can_call ? "CALL" : "CHECK");
          h = await hand(h.id);
        }
        for (let k = 0; k < 40 && h.status !== "COMPLETED"; k++) {
          await revealAll(h.id, ps);
          await due(t);
          await tickOne(t);
          h = await hand(h.id);
        }
        expect(h.status).toBe("COMPLETED");
        dealt.push(
          (await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id}`).map(
            (r) => r.user_id as string,
          ),
        );
        pots.push((h.pots as unknown[]).length);
      }

      let multiPots = 0;
      for (const id of hands) {
        const h = await hand(id);
        const players = (
          await sql`select seat_no, user_id, wagered, folded, won, refund
            from pvp_test.poker_hand_players where hand_id = ${id}::bigint order by seat_no`
        ).map((r) => ({
          seat: Number(r.seat_no),
          user: r.user_id as string,
          wagered: Number(r.wagered),
          folded: r.folded as boolean,
          won: Number(r.won ?? 0),
          refund: Number(r.refund ?? 0),
        }));
        // Independent per-pot contributions with _poker_pots' level and merge rules.
        type Pot = { amount: number; elig: number[]; contrib: Map<number, number> };
        const built: Pot[] = [];
        let prev = 0;
        for (const lvl of [...new Set(players.map((p) => p.wagered).filter((a) => a > 0))].sort(
          (a, b) => a - b,
        )) {
          const contrib = new Map<number, number>();
          let amt = 0;
          for (const p of players) {
            const c = Math.min(p.wagered, lvl) - Math.min(p.wagered, prev);
            if (c > 0) {
              contrib.set(p.seat, c);
              amt += c;
            }
          }
          const elig = players.filter((p) => !p.folded && p.wagered >= lvl).map((p) => p.seat);
          prev = lvl;
          if (!amt) continue;
          const last = built.at(-1);
          const merge = (into: Pot) => {
            into.amount += amt;
            for (const [s, c] of contrib) into.contrib.set(s, (into.contrib.get(s) ?? 0) + c);
          };
          if (!elig.length) {
            if (last) merge(last);
            else built.push({ amount: amt, elig: [], contrib });
          } else if (last && (!last.elig.length || last.elig.join() === elig.join())) {
            merge(last);
            last.elig = elig;
          } else built.push({ amount: amt, elig, contrib });
        }
        const stored = h.pots as { amount: number; fee: number; shares: Record<string, number> }[];
        expect(built.map((p) => p.amount)).toEqual(stored.map((p) => Number(p.amount)));
        if (stored.length > 1) multiPots++;

        const expected = new Map<string, number>();
        const userOf = (s: number) => players.find((p) => p.seat === s)!.user;
        stored.forEach((pot, k) => {
          for (const [cs, c] of built[k]!.contrib)
            for (const [ws, sh] of Object.entries(pot.shares)) {
              if (Number(ws) === cs || Number(sh) <= 0) continue;
              const key = `${userOf(cs)}>${userOf(Number(ws))}`;
              expected.set(key, (expected.get(key) ?? 0) + (c * Number(sh)) / Number(pot.amount));
            }
        });
        const rows = await sql`select * from pvp_test._poker_hand_transfers(${id}::bigint)`;
        expect(rows.every((r) => r.exact === true)).toBe(true);
        const got = new Map<string, number>();
        for (const r of rows) {
          const key = `${r.from_user}>${r.to_user}`;
          got.set(key, (got.get(key) ?? 0) + Number(r.amount));
        }
        expect([...got.keys()].sort()).toEqual([...expected.keys()].sort());
        for (const [k, val] of expected) expect(got.get(k)!).toBeCloseTo(val, 6);

        // Conservation: a player's net transfer is their result plus their part of the fee,
        // and nobody sends more than they put in (no double counting across winners).
        for (const p of players) {
          let net = 0;
          for (const [k, val] of got) {
            if (k.endsWith(`>${p.user}`)) net += val;
            if (k.startsWith(`${p.user}>`)) net -= val;
          }
          const feeShare = stored.reduce(
            (s, pot, k) =>
              s + ((built[k]!.contrib.get(p.seat) ?? 0) * Number(pot.fee)) / Number(pot.amount),
            0,
          );
          // won excludes the uncalled refund, and wagered is net of it.
          expect(net).toBeCloseTo(p.won - p.wagered + feeShare, 6);
          const sent = [...got].filter(([k]) => k.startsWith(`${p.user}>`)).reduce((s, [, a]) => s + a, 0);
          expect(sent).toBeLessThanOrEqual(p.wagered + 1e-9);
        }
      }
      expect(multiPots).toBeGreaterThan(0);

      // The report adds up exactly these per-pot transfers, for every pair it returns.
      const r = (
        await asAdmin((tx) => tx`select pvp_test.poker_admin_collusion_signals(1, 2, 200) r`)
      )[0]!.r;
      expect(r.truncated).toBe(false);
      expect(r.ambiguous_hands).toBe(0);
      const truth = await sql`
        select least(t.from_user, t.to_user) ua, greatest(t.from_user, t.to_user) ub,
          coalesce(sum(t.amount) filter (where t.from_user < t.to_user), 0) a_to_b,
          coalesce(sum(t.amount) filter (where t.from_user > t.to_user), 0) b_to_a
        from pvp_test.poker_hands h cross join lateral pvp_test._poker_hand_transfers(h.id) t
        where h.status = 'COMPLETED' and h.completed_at > clock_timestamp() - interval '1 day'
        group by 1, 2`;
      const mine = (r.pairs as Row[]).filter(
        (p) => ps.some((q) => q.id === p.user_a) && ps.some((q) => q.id === p.user_b),
      );
      expect(mine.length).toBeGreaterThan(0);
      expect(mine.some((p) => p.multiway_hands >= 1)).toBe(true);
      for (const p of r.pairs as Row[]) {
        const tr = truth.find((q) => q.ua === p.user_a && q.ub === p.user_b)!;
        expect(Number(p.a_to_b)).toBeCloseTo(Number(tr.a_to_b), 1);
        expect(Number(p.b_to_a)).toBeCloseTo(Number(tr.b_to_a), 1);
      }

      // A hand whose stored pots no longer match its contributions is excluded and counted.
      const amb = await asAdmin(async (tx) => {
        await tx`alter table pvp_test.poker_hands disable trigger user`;
        await tx`update pvp_test.poker_hands set pots = jsonb_set(pots, '{0,amount}', to_jsonb((pots->0->>'amount')::bigint + 1))
          where id = ${hands[0]!}::bigint`;
        const t1 = await tx`select * from pvp_test._poker_hand_transfers(${hands[0]!}::bigint)`;
        const rep = (await tx`select pvp_test.poker_admin_collusion_signals(1, 2, 200) r`)[0]!.r;
        throw Object.assign(new Error("rollback"), { t1, rep });
      }).catch((e) => e as { t1: Row[]; rep: Row });
      expect(amb.t1).toHaveLength(1);
      expect(amb.t1[0]!.exact).toBe(false);
      expect(amb.t1[0]!.from_user).toBeNull();
      expect(amb.rep.ambiguous_hands).toBe(1);
      expect(Object.keys(amb.rep).some((k) => /card|email|ip/i.test(k))).toBe(false);
      expect(amb.rep.note).toMatch(/not evidence/);
      expect(await ledgerOk()).toBe(true);
    },
    LONG,
  );
});
