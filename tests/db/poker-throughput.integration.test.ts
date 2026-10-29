/**
 * Many poker tables: the worker cap, idle ticks that must not wake spectators,
 * and shared reads of the public table and lobby.
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { creditUserDeposit, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows and jsonb come back untyped
type Row = Record<string, any>;
type P = { id: string; links: string[] };

function chain(n = 80) {
  const l = new Array<string>(n + 1);
  l[n] = randomBytes(32).toString("hex");
  for (let k = n; k > 0; k--)
    l[k - 1] = createHash("sha256").update(Buffer.from(l[k]!, "hex")).digest("hex");
  return l;
}

const as = <T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;

let n = 0;
async function player(dep = 100_000): Promise<P> {
  const id = randomUUID();
  await as(
    id,
    (tx) => tx`select pvp_test.ensure_profile(${`th${++n}${id.slice(0, 8)}`.slice(0, 20)}, true)`,
  );
  for (const k of ["user_available", "user_locked"])
    await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
      select ${id}::uuid, ${k}::pvp_test.account_kind, 'USD', 'real'
      where not exists (select 1 from pvp_test.wallet_accounts where owner_id = ${id}::uuid
        and kind = ${k}::pvp_test.account_kind and asset = 'USD' and account_type = 'real')`;
  if (dep > 0) await sql.begin((tx) => creditUserDeposit(tx, id, dep));
  return { id, links: chain() };
}

async function newTable(): Promise<number> {
  const r =
    await sql`insert into pvp_test.poker_tables (type_id, name, money_domain, asset, account_type,
      small_blind, big_blind, min_buy_in, max_buy_in, max_seats, fee_bps)
    select ty.id, 'throughput', jc.money_domain, jc.asset, jc.account_type, ty.small_blind, ty.big_blind,
      ty.min_buy_in, ty.max_buy_in, ty.max_seats, c.fee_bps
    from pvp_test.poker_table_types ty, pvp_test.money_domain_config jc, pvp_test.poker_config c
    where ty.id = 1 returning id`;
  return Number(r[0]!.id);
}

const sit = (p: P, table: number) =>
  as(
    p.id,
    (tx) => tx`select pvp_test.poker_sit(${table}::bigint, null::smallint, null::smallint, 500::bigint,
      ${p.links[0]!}, ${randomUUID()}) r`,
  );

d("poker throughput", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    for (const k of ["game_escrow", "house_revenue", "house_bankroll"])
      await sql`select pvp_test._system_account(${k}::pvp_test.account_kind, 'USD', 'real')`;
    await sql`update pvp_test.poker_config set enabled = true, reveal_seconds = 30, action_seconds = 20,
      showdown_seconds = 1, between_hands_seconds = 1, runout_street_seconds = 0, max_active_tables = 500`;
  }, 600_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("raises the per-tick table cap and only broadcasts a version change", async () => {
    const [cfg] = await sql`select tick_tables from pvp_test.poker_config`;
    expect(Number(cfg!.tick_tables)).toBe(100);
    const [worker] = await sql`select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'pvp_test' and p.proname = 'slot_tick_worker'`;
    expect(String(worker!.prosrc)).toContain("tick_tables");
    expect(String(worker!.prosrc)).toContain("400 milliseconds");
    const [trg] = await sql`select pg_get_triggerdef(t.oid) def from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'pvp_test' and t.tgname = 'poker_tables_feed' and not t.tgisinternal`;
    expect(String(trg!.def).toLowerCase()).toContain("is distinct from");
    expect(String(trg!.def).toLowerCase()).toContain("version");
  });

  it("an early tick does not bump the version, and the shared reads stay personal", async () => {
    const [a, b] = [await player(), await player()];
    const table = await newTable();
    await sit(a, table);
    await sit(b, table);
    const version = async () =>
      Number((await sql`select version from pvp_test.poker_tables where id = ${table}`)[0]!.version);
    const v0 = await version();
    const hand = (
      await sql`select status from pvp_test.poker_hands where table_id = ${table} order by id desc limit 1`
    )[0]!;
    expect(hand.status).toBe("COMMIT");

    await sql`update pvp_test.poker_tables set next_due_at = clock_timestamp() where id = ${table}`;
    const [step] = await sql`select pvp_test._poker_tick_one(${table}::bigint) r`;
    expect(step!.r).toBe("idle");
    expect(await version()).toBe(v0);

    const state = async () =>
      (await as(a.id, (tx) => tx`select pvp_test.poker_table_state(${table}::bigint) r`))[0]!.r as Row;
    const first = await state();
    expect(first.me.seat_no).toEqual(expect.any(Number));
    expect(first.hand.status).toBe("COMMIT");
    expect(first.hand.street).not.toBe("RIVER");
    const [cached] = await sql`select version from pvp_test.poker_state_cache where table_id = ${table}`;
    expect(Number(cached!.version)).toBe(v0);
    await sql`update pvp_test.poker_state_cache set body = jsonb_set(body, '{hand,street}', '"RIVER"')
      where table_id = ${table}`;
    const poisoned = await state();
    expect(poisoned.hand.street).toBe("RIVER");
    expect(poisoned.me.hole_cards).toEqual(first.me.hole_cards);
    expect(poisoned.seats).toHaveLength(2);

    const lobby = async () =>
      (await as(a.id, (tx) => tx`select pvp_test.poker_lobby() r`))[0]!.r as Row;
    const open = await lobby();
    const row = (open.tables as Row[]).find((t) => Number(t.id) === table);
    expect(row.players).toHaveLength(2);
    expect(open.mine).toEqual([
      expect.objectContaining({ table_id: table, stack: expect.any(Number) }),
    ]);
    await sql`update pvp_test.poker_lobby_cache set tables = '[]'::jsonb`;
    expect((await lobby()).tables).toEqual([]);
    expect((await lobby()).mine).toHaveLength(1);

    await as(a.id, (tx) => tx`select pvp_test.poker_sit_out(${table}::bigint, true, null)`);
    expect(await version()).toBeGreaterThan(v0);
    const live = await state();
    expect(live.hand.street).not.toBe("RIVER");
    expect(live.table.version).toBe(await version());
    const again = await lobby();
    expect((again.tables as Row[]).find((t) => Number(t.id) === table).players).toHaveLength(2);
    expect(again.mine[0].state).toBe("SITTING_OUT");
  }, 120_000);
});
