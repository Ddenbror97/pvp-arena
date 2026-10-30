/**
 * Records real `poker_table_state` snapshots, as one seated player sees them, while three
 * players play scripted hands through the player RPCs on the isolated pvp_test schema.
 *
 * The recording backs the presentation tests (tests/poker-presentation.test.ts) and the
 * dev-only replay page. Every snapshot is engine output: nothing in it is hand-written.
 * Run with RECORD_POKER_FIXTURE=1 (and TEST_DATABASE_URL) to refresh the file.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { applyTestSchema } from "./schema";
import { creditUserDeposit, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";
import { buildChain, randomSecret } from "../../src/lib/fairness/poker";

const url = testDatabaseUrl();
const recording = process.env["RECORD_POKER_FIXTURE"] === "1";
const d = url && (recording || process.env["VERIFY_POKER_FIXTURE"] === "1") ? describe : describe.skip;
const sql = url ? postgres(url, { max: 4, prepare: false, onnotice: () => {} }) : (null as never);
const OUT = recording ? "src/lib/poker/replay/recorded-hands.json" : "test-results/poker-recorded-hands.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsonb comes back untyped
type Row = Record<string, any>;
type P = { id: string; name: string; links: string[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const as = <T,>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;

d("record poker presentation fixture", () => {
  beforeAll(async () => {
    await applyTestSchema(sql);
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    for (const k of ["game_escrow", "house_revenue", "house_bankroll"])
      await sql`select pvp_test._system_account(${k}::pvp_test.account_kind, 'USD', 'real')`;
    await sql`update pvp_test.poker_config set enabled = true, reveal_seconds = 2, action_seconds = 20,
      showdown_seconds = 1, between_hands_seconds = 1, runout_street_seconds = 0, max_active_tables = 500`;
  }, 300_000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("plays and records scripted hands", async () => {
    const names = ["You", "CryptoKing", "LuckyGirl"];
    const ps: P[] = [];
    for (const name of names) {
      const id = randomUUID();
      await as(id, (tx) => tx`select pvp_test.ensure_profile(${`rec${id.slice(0, 8)}`}, true)`);
      await sql`update pvp_test.profiles set username = ${name === "You" ? "AcePilot" : name} where id = ${id}::uuid`;
      for (const kind of ["user_available", "user_locked"])
        await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
          values (${id}::uuid, ${kind}::pvp_test.account_kind, 'USD', 'real') on conflict do nothing`;
      await sql.begin((tx) => creditUserDeposit(tx, id, 20_000));
      ps.push({ id, name, links: await buildChain(randomSecret(), 40) });
    }
    const hero = ps[0]!;
    const frames: Row[] = [];
    let table = 0;
    const snap = async (label: string) => {
      const s = (await as(hero.id, (tx) => tx`select pvp_test.poker_table_state(${table}::bigint) r`))[0]!.r as Row;
      delete s.recent;
      frames.push({ label, state: s });
    };
    const sit = async (p: P, seat: number, buyIn: number) => {
      const r = (
        await as(p.id, (tx) => tx`select pvp_test.poker_sit(${table || null}::bigint, 4::smallint, ${seat}::smallint,
          ${buyIn}::bigint, ${p.links[0]!}, ${randomUUID()}) r`)
      )[0]!.r as Row;
      table = r.table_id;
    };
    const latest = async () =>
      (await sql`select * from pvp_test.poker_hands where table_id = ${table} order by id desc limit 1`)[0] as Row;
    const reveal = async () => {
      const h = await latest();
      for (const r of await sql`select user_id, link from pvp_test.poker_hand_players where hand_id = ${h.id} and reveal is null`) {
        const p = ps.find((x) => x.id === r.user_id)!;
        await as(p.id, (tx) => tx`select pvp_test.poker_reveal(${h.id}::bigint, ${p.links[p.links.indexOf(r.link) + 1]!})`);
        await snap(`reveal ${p.name}`);
      }
    };
    type Plan = (name: string, la: Row, h: Row) => [string, number?];
    const play = async (plan: Plan) => {
      await reveal();
      for (let i = 0; i < 60; i++) {
        const h = await latest();
        if (h.status !== "BETTING") break;
        const who = (await sql`select user_id from pvp_test.poker_hand_players where hand_id = ${h.id} and seat_no = ${h.to_act}`)[0]!;
        const p = ps.find((x) => x.id === who.user_id)!;
        const st = (await as(p.id, (tx) => tx`select pvp_test.poker_table_state(${table}::bigint) r`))[0]!.r as Row;
        const [a, amt] = plan(p.name, st.me.legal, h);
        await as(p.id, (tx) => tx`select pvp_test.poker_act(${h.id}::bigint, ${st.hand.version}::int, ${a}, ${amt ?? 0}::bigint, ${randomUUID()})`);
        await snap(`${p.name} ${a}${amt ? ` ${amt}` : ""}`);
      }
      const done = await latest();
      expect(done.status).toBe("COMPLETED");
    };
    const next = async () => {
      const h = await latest();
      const ms = +new Date(h.next_hand_at) - Date.now() + 80;
      if (ms > 0) await sleep(ms);
      await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
      await as(null, (tx) => tx`select pvp_test.poker_tick()`);
      await snap("next hand opens");
    };

    await sit(hero, 0, 4000);
    await snap("you sit down");
    await sit(ps[1]!, 2, 5000);
    await sit(ps[2]!, 4, 3000);
    await snap("table fills");

    // Hand 1: heads-up opener (the third player joined after it opened) to a checked-down showdown.
    const passive: Plan = (_n, la) => [la.can_check ? "CHECK" : "CALL"];
    await play(passive);
    await next();
    // Hand 2: three-way. A raise, a re-raise, a fold, then a turn all-in and a runout.
    await play((n, la, h) => {
      if (h.street === "PREFLOP" && n === "CryptoKing" && la.can_raise && la.to_call <= 50)
        return ["RAISE", la.min_raise_to + 50];
      if (h.street === "PREFLOP" && n === "LuckyGirl") return la.to_call > 0 ? ["FOLD"] : ["CHECK"];
      if (h.street === "TURN" && n === "You" && la.can_raise) return ["ALL_IN"];
      return [la.can_check ? "CHECK" : "CALL"];
    });
    await next();
    // Hand 3: a preflop raise everyone folds to (no flop, no fee).
    const raised = new Set<string>();
    await play((n, la) => {
      if (la.can_raise && n === "LuckyGirl" && !raised.has(n)) {
        raised.add(n);
        return ["RAISE", la.min_raise_to];
      }
      return la.to_call > 0 ? ["FOLD"] : ["CHECK"];
    });
    await next();

    writeFileSync(OUT, JSON.stringify({ recordedAt: new Date().toISOString(), heroName: "AcePilot", frames }, null, 0) + "\n");
    expect(frames.length).toBeGreaterThan(20);
  }, 300_000);
});
