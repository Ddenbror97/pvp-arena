/**
 * Pool ledger and rules-hash parity against the isolated schema.
 * The winner paid here is the seat the rules named. Fee is 5% of the pot.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { testDatabaseUrl } from "./test-url";
import { applyTimeout, freshTable, stateHash } from "../../src/lib/pool/rules";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 }) : (null as never);

async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

async function newUser(name: string) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${name}, true)`);
  return id;
}

const bal = async (uid: string, kind = "user_available") =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = 'test_credit'`
    )[0].balance,
  );

d("pool ledger (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 180_000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("hashes a rack the same way as the published rules", async () => {
    const table = freshTable(Uint8Array.from({ length: 32 }, (_, i) => i + 3));
    const [row] = await sql`select pvp_test.pool_state_hash(${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb) as h`;
    expect(row.h).toBe(stateHash(table));
  });

  it("locks a stake, refunds a cancel, and pays 95% with a 5% fee", async () => {
    const a = await newUser("alice");
    const b = await newUser("bobby");
    const before = await bal(a);
    const created = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    expect(created.role).toBe("created");
    expect(await bal(a)).toBe(before - 100);
    expect(await bal(a, "user_locked")).toBe(100);

    await as(a, async (tx) => {
      await tx`select pvp_test.pool_cancel(${created.match_id})`;
    });
    expect(await bal(a)).toBe(before);
    expect(await bal(a, "user_locked")).toBe(0);

    const again = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    const joined = await as(b, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    expect(joined.role).toBe("joined");
    expect(joined.match_id).toBe(again.match_id);
    expect(await bal(b, "user_locked")).toBe(100);

    const table = freshTable(new Uint8Array(32).fill(4));
    const hash = stateHash(table);
    await sql`select pvp_test.pool_begin(${joined.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    const [started] = await sql`select state_hash, status from pvp_test.pool_matches where id = ${joined.match_id}`;
    expect(started.status).toBe("PLAYING");
    expect(started.state_hash).toBe(hash);

    const won = {
      ...table,
      shot: 1,
      winner: "A",
      reason: "FORFEIT",
      turn: "B",
      ballInHand: false,
      kitchenOnly: false,
    };
    const wonHash = stateHash(won);
    await sql`insert into pvp_test.pool_pending (match_id, seq, user_id, idempotency_key, input)
      values (${joined.match_id}, 1, ${a}, ${randomUUID()}, '{}'::jsonb)`;
    await sql`select pvp_test.pool_commit_shot(${joined.match_id}, 1, ${sql.json(JSON.parse(JSON.stringify(won)))}::jsonb, ${wonHash}, '{"reason":"FORFEIT"}'::jsonb)`;

    const [done] = await sql`select status, fee_amount, payout_amount, winner_id from pvp_test.pool_matches where id = ${joined.match_id}`;
    expect(done.status).toBe("COMPLETED");
    expect(done.winner_id).toBe(a);
    expect(Number(done.fee_amount)).toBe(10);
    expect(Number(done.payout_amount)).toBe(190);
    expect(Number(done.fee_amount) + Number(done.payout_amount)).toBe(200);
    expect(await bal(a)).toBe(before - 100 + 190);
    expect(await bal(b)).toBe(before - 100);
    expect(await bal(a, "user_locked")).toBe(0);
    expect(await bal(b, "user_locked")).toBe(0);

    const [books] = await sql`select coalesce(sum(balance), 0)::bigint s from pvp_test.wallet_accounts`;
    expect(Number(books.s)).toBe(0);

    await expect(
      sql`select pvp_test.pool_commit_shot(${joined.match_id}, 1, ${sql.json(won)}::jsonb, ${wonHash}, '{}'::jsonb)`,
    ).resolves.toBeTruthy();
    const [once] = await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${joined.match_id} and kind = 'pool_settlement'`;
    expect(once.c).toBe(1);
  });

  it("does not seat one player on both sides of a table", async () => {
    const a = await newUser("cara");
    const created = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(200, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    const second = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(200, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    expect(created.role).toBe("created");
    expect(second.role).toBe("created");
    expect(second.match_id).not.toBe(created.match_id);
    const rows = await sql`select status, opponent_id from pvp_test.pool_matches where creator_id = ${a}`;
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((row) => row.opponent_id == null && row.status === "WAITING")).toBe(true);
  });

  it("logs a shot-clock timeout with the same hash as the rules", async () => {
    const a = await newUser("dina");
    const b = await newUser("eric");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(500, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await as(b, async (tx) => {
      await tx`select pvp_test.pool_matchmake(500, ${randomUUID()})`;
    });
    const table = freshTable(new Uint8Array(32).fill(8));
    await sql`select pvp_test.pool_begin(${made.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    await sql`select pvp_test._pool_log_timeout(${made.match_id})`;
    const [row] = await sql`select state_hash from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(row.state_hash).toBe(stateHash(applyTimeout(table)));
  });

  it("blocks a self-excluded player from opening a table", async () => {
    const a = await newUser("fiona");
    await sql`update pvp_test.profiles set self_excluded_until = clock_timestamp() + interval '1 day' where id = ${a}`;
    await expect(
      as(a, async (tx) => {
        await tx`select pvp_test.pool_matchmake(100, ${randomUUID()})`;
      }),
    ).rejects.toThrow(/SELF_EXCLUDED/);
  });
});
