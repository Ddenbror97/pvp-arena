/**
 * 20261014340000_roulette_integrity_open_recheck: the chain is built without it first, so the
 * pre-migration behaviour and the upgrade of existing incidents are both exercised.
 * An unresolved roulette incident must stay visible after the 48-hour window without
 * duplicate rows, hourly alert noise, or any automatic acknowledgement.
 * Isolated schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTestSchemaSql } from "./schema";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const warnings: string[] = [];
const sql = url
  ? postgres(url, {
      max: 4,
      prepare: false,
      idle_timeout: 5,
      onnotice: (n) => {
        if (String(n.message).startsWith("INTEGRITY_INCIDENT")) warnings.push(String(n.message));
      },
    })
  : (null as never);

const toTest = (s: string) =>
  s.replace(/public\./g, "pvp_test.").replace(/search_path = public/g, "search_path = pvp_test");
const MIGRATION = "20261014340000_roulette_integrity_open_recheck.sql";
const proposalSql = () =>
  toTest(readFileSync(join(process.cwd(), "supabase/migrations", MIGRATION), "utf8"));
// Rollback = the previous production definition, taken verbatim from its migration.
const rollbackSql = () => {
  const src = readFileSync(
    join(process.cwd(), "supabase/migrations/20261011180000_settle-workers-and-integrity.sql"),
    "utf8",
  );
  const start = src.indexOf("create or replace function public.roulette_integrity_check()");
  const end = src.indexOf("$fn$;", start) + "$fn$;".length;
  expect(start).toBeGreaterThan(0);
  return toTest(src.slice(start, end));
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

d("roulette integrity: open incidents stay visible after 48 hours", () => {
  let broken = 0;
  let healthy = 0;

  async function as<T>(uid: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
    return sql.begin(async (tx) => {
      await tx`select set_config('test.uid', ${uid}, true)`;
      return fn(tx);
    }) as Promise<T>;
  }
  async function newUser(name: string, credit: number) {
    const id = randomUUID();
    await as(
      id,
      (tx) =>
        tx`select pvp_test.ensure_profile(${(name + "_" + id.slice(0, 6)).slice(0, 20)}, true)`,
    );
    await sql.begin(async (tx) => {
      const [t] =
        await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
        values ('test_credit_grant', ${"ic:" + randomUUID()}, 'test_credit', ${id}, 'grant') returning id`;
      await tx`select pvp_test._post(${t!.id}, pvp_test._system_account('test_faucet','TEST_USD','test_credit'), ${-credit})`;
      await tx`select pvp_test._post(${t!.id}, pvp_test._user_account(${id}, 'user_available','TEST_USD','test_credit'), ${credit})`;
    });
    return id;
  }
  async function playRound(uid: string) {
    const r = await as(
      uid,
      async (tx) =>
        (
          await tx`select pvp_test.roulette_bet('RED'::pvp_test.roulette_color, 1000::bigint, ${randomUUID()}) as r`
        )[0]!.r,
    );
    const gid = Number((r as { game_id: number }).game_id);
    for (let i = 0; i < 200; i++) {
      const [g] = await sql`select status from pvp_test.roulette_games where id = ${gid}`;
      if (g!.status === "COMPLETED") return gid;
      await sql`select pvp_test.roulette_advance(${gid})`;
      await sleep(50);
    }
    throw new Error("round did not finish");
  }
  // Age a round past the window and park the history cursors past it, as in production
  // where a 53k-round history means the cursor revisits a given id only every ~4.5 days.
  async function ageOut(ids: number[]) {
    await sql.unsafe(`alter table pvp_test.roulette_games disable trigger user`);
    await sql`update pvp_test.roulette_games set completed_at = now() - interval '72 hours',
      created_at = now() - interval '72 hours' where id = any(${ids}::bigint[])`;
    await sql.unsafe(`alter table pvp_test.roulette_games enable trigger user`);
  }
  async function parkCursors() {
    const [m] =
      await sql`select max(id)::bigint m from pvp_test.roulette_games where status in ('COMPLETED','CANCELLED')`;
    await sql`insert into pvp_test.integrity_scan_cursor (name, last_id, updated_at)
      values ('roulette', ${m!.m}, now()), ('roulette_after', ${m!.m}, now())
      on conflict (name) do update set last_id = excluded.last_id`;
  }
  async function check() {
    await parkCursors();
    warnings.length = 0;
    return (await sql`select pvp_test.roulette_integrity_check() as r`)[0]!.r as Record<
      string,
      number
    >;
  }
  type Incident = {
    fingerprint: string;
    occurrences: number;
    last_seen_at: string;
    last_alerted_at: string | null;
    acknowledged_at: string | null;
  };
  // to_jsonb: the same read works before and after the proposal adds its columns.
  const incidents = async () =>
    (
      await sql`select to_jsonb(i) j from pvp_test.integrity_incidents i
        where check_name like 'roulette%' order by fingerprint`
    ).map((r) => {
      const j = r.j as Record<string, unknown>;
      return {
        fingerprint: j.fingerprint,
        occurrences: j.occurrences,
        last_seen_at: j.last_seen_at,
        last_alerted_at: j.last_alerted_at ?? null,
        acknowledged_at: j.acknowledged_at ?? null,
      } as Incident;
    });
  const incident = async (fp: string) => (await incidents()).find((i) => i.fingerprint === fp);

  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql([MIGRATION]));
    await sql`update pvp_test.roulette_config set betting_seconds = 1, lock_ms = 100, spin_ms = 200,
      max_bet = 1000000, max_pot = 100000000, max_bets_per_user = 10, max_bets_per_round = 500`;
    const a = await newUser("ica", 100_000);
    const b = await newUser("icb", 100_000);
    broken = await playRound(a);
    healthy = await playRound(b);
    // Same shape as the production purge: game and ledger kept, bet and payout rows removed.
    await sql.unsafe(`alter table pvp_test.roulette_payouts disable trigger user;
      alter table pvp_test.roulette_bets disable trigger user;
      delete from pvp_test.roulette_payouts where game_id = ${broken};
      delete from pvp_test.roulette_bets where game_id = ${broken};
      alter table pvp_test.roulette_bets enable trigger user;
      alter table pvp_test.roulette_payouts enable trigger user;`);
  }, 240_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("today: the incident goes quiet once the round leaves the 48-hour window", async () => {
    const first = await check();
    expect(first.incidents).toBeGreaterThanOrEqual(2);
    expect(warnings.length).toBe(first.incidents);
    const before = await incidents();
    expect(before.map((r) => r.fingerprint)).toEqual(
      expect.arrayContaining([`rle:${broken}`, `rlp:${broken}`]),
    );

    await ageOut([broken, healthy]);
    const aged = await check();
    expect(aged.incidents).toBe(0);
    expect(warnings).toEqual([]);
    const after = await incidents();
    expect(after.map((r) => r.occurrences)).toEqual(before.map((r) => r.occurrences));
  });

  it("migration only adds nullable columns: existing incidents stay open and untouched", async () => {
    const before = await incidents();
    await sql.unsafe(proposalSql());
    const after = await incidents();
    expect(after.length).toBe(before.length);
    for (const [i, row] of after.entries()) {
      expect(row.fingerprint).toBe(before[i]!.fingerprint);
      expect(row.occurrences).toBe(before[i]!.occurrences);
      expect(row.acknowledged_at).toBeNull();
      expect(row.last_alerted_at).toBeNull();
    }
    const [acl] =
      await sql`select has_function_privilege('anon', 'pvp_test.roulette_integrity_check()', 'execute') anon,
      has_function_privilege('authenticated', 'pvp_test.roulette_integrity_check()', 'execute') auth`;
    expect(acl).toEqual({ anon: false, auth: false });
  });

  it("re-detects the open incident after 48 hours and alerts once, with no duplicate rows", async () => {
    const before = await incidents();
    const r = await check();
    expect(r.rechecked).toBe(1);
    expect(r.incidents).toBe(before.length);
    expect(r.alerts).toBe(before.length);
    expect(warnings.length).toBe(before.length);
    const after = await incidents();
    expect(after.length).toBe(before.length);
    for (const [i, row] of after.entries()) {
      expect(row.occurrences).toBe(before[i]!.occurrences + 1);
      expect(new Date(row.last_seen_at).getTime()).toBeGreaterThan(
        new Date(before[i]!.last_seen_at).getTime(),
      );
      expect(row.last_alerted_at).not.toBeNull();
    }
    const [dupes] =
      await sql`select count(*)::int n from (select fingerprint from pvp_test.integrity_incidents
      group by fingerprint having count(*) > 1) x`;
    expect(dupes!.n).toBe(0);
  });

  it("the next hourly runs keep counting but do not alert again", async () => {
    const before = await incidents();
    for (let i = 0; i < 3; i++) {
      const r = await check();
      expect(r.incidents).toBe(before.length);
      expect(r.alerts).toBe(0);
      expect(warnings).toEqual([]);
    }
    const after = await incidents();
    for (const [i, row] of after.entries()) {
      expect(row.occurrences).toBe(before[i]!.occurrences + 3);
      expect(row.last_alerted_at).toEqual(before[i]!.last_alerted_at);
    }
  });

  it("reminds once a day while still open, and alerts when an incident comes back after a clean run", async () => {
    await sql`update pvp_test.integrity_incidents set last_alerted_at = now() - interval '25 hours'
      where fingerprint = ${"rlp:" + broken}`;
    let r = await check();
    expect(r.alerts).toBe(1);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("roulette_pot_mismatch");

    await sql`update pvp_test.integrity_incidents set last_seen_at = now() - interval '2 hours'
      where fingerprint = ${"rle:" + broken}`;
    r = await check();
    expect(r.alerts).toBe(1);
    expect(warnings[0]).toContain("roulette_entry_debit_mismatch");
  });

  it("a repaired round keeps its incident row; last_seen_at just stops advancing", async () => {
    await sql`insert into pvp_test.integrity_incidents (check_name, fingerprint, details, last_seen_at)
      values ('roulette_pot_mismatch', ${"rlp:" + healthy}, '{}'::jsonb, now() - interval '3 days')`;
    const before = await incident("rlp:" + healthy);
    const r = await check();
    expect(r.rechecked).toBe(2);
    expect(warnings.some((w) => /"game_id": ?(\d+)/.exec(w)?.[1] === String(healthy))).toBe(false);
    expect(await incident("rlp:" + healthy)).toEqual(before);
    expect(before?.acknowledged_at).toBeNull();
  });

  it("acknowledgement is manual, needs a note, and stops recheck and alerts for that incident only", async () => {
    const ack = (note: string | null) =>
      sql`update pvp_test.integrity_incidents set acknowledged_at = now(), acknowledged_note = ${note}
        where fingerprint = ${"rlp:" + healthy}`;
    await expect(ack(null)).rejects.toMatchObject({ code: "23514" });
    await expect(ack("  ")).rejects.toMatchObject({ code: "23514" });
    await ack("restored from backup, verified against ledger");
    const r = await check();
    expect(r.rechecked).toBe(1);

    await sql`update pvp_test.integrity_incidents set acknowledged_at = now(), acknowledged_note = 'test'
      where fingerprint like ${"%:" + broken}`;
    await sql`update pvp_test.integrity_incidents set last_alerted_at = now() - interval '2 days'
      where fingerprint like ${"%:" + broken}`;
    const quiet = await check();
    expect(quiet.rechecked).toBe(0);
    expect(quiet.alerts).toBe(0);
    expect(warnings).toEqual([]);
  });

  it("rollback restores the production definition and keeps all incident rows", async () => {
    const [{ n: rows }] = await sql`select count(*)::int n from pvp_test.integrity_incidents`;
    await sql.unsafe(rollbackSql());
    const r = await check();
    expect(r).not.toHaveProperty("rechecked");
    expect(r.incidents).toBe(0);
    const [{ n: after }] = await sql`select count(*)::int n from pvp_test.integrity_incidents`;
    expect(after).toBe(rows);
  });
});
