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
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

async function as<T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
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
    const [row] =
      await sql`select pvp_test.pool_state_hash(${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb) as h`;
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
    const [started] =
      await sql`select state_hash, status from pvp_test.pool_matches where id = ${joined.match_id}`;
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

    const [done] =
      await sql`select status, fee_amount, payout_amount, winner_id from pvp_test.pool_matches where id = ${joined.match_id}`;
    expect(done.status).toBe("COMPLETED");
    expect(done.winner_id).toBe(a);
    expect(Number(done.fee_amount)).toBe(10);
    expect(Number(done.payout_amount)).toBe(190);
    expect(Number(done.fee_amount) + Number(done.payout_amount)).toBe(200);
    expect(await bal(a)).toBe(before - 100 + 190);
    expect(await bal(b)).toBe(before - 100);
    expect(await bal(a, "user_locked")).toBe(0);
    expect(await bal(b, "user_locked")).toBe(0);

    const [books] =
      await sql`select coalesce(sum(balance), 0)::bigint s from pvp_test.wallet_accounts`;
    expect(Number(books.s)).toBe(0);

    await expect(
      sql`select pvp_test.pool_commit_shot(${joined.match_id}, 1, ${sql.json(won)}::jsonb, ${wonHash}, '{}'::jsonb)`,
    ).resolves.toBeTruthy();
    const [once] =
      await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${joined.match_id} and kind = 'pool_settlement'`;
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
    const rows =
      await sql`select status, opponent_id from pvp_test.pool_matches where creator_id = ${a}`;
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
    const [row] =
      await sql`select state_hash from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(row.state_hash).toBe(stateHash(applyTimeout(table)));
  });

  it("hides the rack seed until the match is playing", async () => {
    const a = await newUser("gina");
    const b = await newUser("hugo");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await as(b, async (tx) => {
      await tx`select pvp_test.pool_matchmake(100, ${randomUUID()})`;
    });
    const [starting] = await sql`select pvp_test.pool_state(${made.match_id}) s`;
    expect(starting.s.status).toBe("STARTING");
    expect(starting.s.server_seed).toBeNull();
    expect(typeof starting.s.server_seed_hash).toBe("string");

    const secret = await sql`select pvp_test.pool_read_secret(${made.match_id}) seed`;
    const table = freshTable(new Uint8Array(32).fill(9));
    await sql`select pvp_test.pool_begin(${made.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    const [live] = await sql`select pvp_test.pool_state(${made.match_id}) s`;
    expect(live.s.status).toBe("PLAYING");
    expect(live.s.server_seed).toBe(secret[0].seed);
    expect(live.s.server_seed_hash).toBe(starting.s.server_seed_hash);
  });

  it("rejects a shot hash that does not match the submitted table", async () => {
    const a = await newUser("iris");
    const b = await newUser("jules");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await as(b, async (tx) => {
      await tx`select pvp_test.pool_matchmake(100, ${randomUUID()})`;
    });
    const table = freshTable(new Uint8Array(32).fill(6));
    await sql`select pvp_test.pool_begin(${made.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    await sql`insert into pvp_test.pool_pending (match_id, seq, user_id, idempotency_key, input)
      values (${made.match_id}, 1, ${a}, ${randomUUID()}, '{}'::jsonb)`;
    const forged = { ...table, shot: 1, winner: "A", reason: "EIGHT_BALL" };
    await expect(
      sql`select pvp_test.pool_commit_shot(${made.match_id}, 1, ${sql.json(JSON.parse(JSON.stringify(forged)))}::jsonb, ${"0".repeat(16)}, '{}'::jsonb)`,
    ).rejects.toThrow(/HASH_MISMATCH/);
    const [still] = await sql`select status from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(still.status).toBe("PLAYING");
    const [paid] =
      await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${made.match_id} and kind = 'pool_settlement'`;
    expect(paid.c).toBe(0);
  });

  it("pays 95 percent at every stake and refuses a second settlement", async () => {
    const waiting =
      await sql`select id, creator_id from pvp_test.pool_matches where status = 'WAITING'`;
    for (const open of waiting) {
      await as(String(open.creator_id), async (tx) => {
        await tx`select pvp_test.pool_cancel(${open.id})`;
      });
    }
    const stakes = [100, 200, 500, 1000, 2500, 5000];
    for (const stake of stakes) {
      const a = await newUser(`s${stake}a`);
      const b = await newUser(`s${stake}b`);
      const beforeA = await bal(a);
      const beforeB = await bal(b);
      const made = await as(a, async (tx) => {
        const [row] = await tx`select pvp_test.pool_matchmake(${stake}, ${randomUUID()}) r`;
        return row.r as { match_id: number; role: string };
      });
      expect(made.role).toBe("created");
      const joined = await as(b, async (tx) => {
        const [row] = await tx`select pvp_test.pool_matchmake(${stake}, ${randomUUID()}) r`;
        return row.r as { match_id: number; role: string };
      });
      expect(joined.role).toBe("joined");
      expect(joined.match_id).toBe(made.match_id);
      const table = freshTable(new Uint8Array(32).fill(stake % 255));
      const won = {
        ...table,
        shot: 1,
        winner: "B",
        reason: "FORFEIT",
        turn: "A",
        ballInHand: false,
        kitchenOnly: false,
      };
      await sql`select pvp_test.pool_begin(${made.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
      await sql`insert into pvp_test.pool_pending (match_id, seq, user_id, idempotency_key, input)
        values (${made.match_id}, 1, ${a}, ${randomUUID()}, '{}'::jsonb)`;
      await sql`select pvp_test.pool_commit_shot(${made.match_id}, 1, ${sql.json(JSON.parse(JSON.stringify(won)))}::jsonb, ${stateHash(won)}, '{"reason":"FORFEIT"}'::jsonb)`;
      const pot = stake * 2;
      const fee = Math.floor((pot * 500) / 10000);
      const [done] =
        await sql`select fee_amount, payout_amount, winner_id from pvp_test.pool_matches where id = ${made.match_id}`;
      expect(Number(done.fee_amount)).toBe(fee);
      expect(Number(done.payout_amount)).toBe(pot - fee);
      expect(done.winner_id).toBe(b);
      expect(await bal(a)).toBe(beforeA - stake);
      expect(await bal(b)).toBe(beforeB - stake + (pot - fee));
      await sql`select pvp_test.pool_commit_shot(${made.match_id}, 1, ${sql.json(JSON.parse(JSON.stringify(won)))}::jsonb, ${stateHash(won)}, '{}'::jsonb)`;
      const [once] =
        await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${made.match_id} and kind = 'pool_settlement'`;
      expect(once.c).toBe(1);
    }
    const [books] =
      await sql`select coalesce(sum(balance), 0)::bigint s from pvp_test.wallet_accounts`;
    expect(Number(books.s)).toBe(0);
  });

  it("gives one reconnect window and does not restart the shot clock", async () => {
    const a = await newUser("kara");
    const b = await newUser("liam");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await as(b, async (tx) => {
      await tx`select pvp_test.pool_matchmake(100, ${randomUUID()})`;
    });
    const table = freshTable(new Uint8Array(32).fill(11));
    await sql`select pvp_test.pool_begin(${made.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    await sql`update pvp_test.pool_matches set seen_a = clock_timestamp() - interval '20 seconds',
      turn_deadline = clock_timestamp() - interval '1 second' where id = ${made.match_id}`;
    const [grace] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(grace.r).toBe("grace");
    const [window] =
      await sql`select turn_deadline, grace_shot from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(window.grace_shot).toBe(0);
    await as(a, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    const [back] =
      await sql`select turn_deadline, grace_until from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(new Date(back.turn_deadline).getTime()).toBe(new Date(window.turn_deadline).getTime());
    expect(back.grace_until).toBeNull();
    await sql`update pvp_test.pool_matches set seen_a = clock_timestamp() - interval '20 seconds',
      turn_deadline = clock_timestamp() - interval '1 second' where id = ${made.match_id}`;
    const [again] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(again.r).toBe("timeout");
    const [row] = await sql`select state from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(row.state.timeouts.A).toBe(1);
    expect(row.state.turn).toBe("B");
    expect(row.state.winner).toBeNull();
  });

  it("rejects a shot with no spin", async () => {
    const a = await newUser("mina");
    const b = await newUser("nils");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await as(b, async (tx) => {
      await tx`select pvp_test.pool_matchmake(100, ${randomUUID()})`;
    });
    const table = freshTable(new Uint8Array(32).fill(12));
    await sql`select pvp_test.pool_begin(${made.match_id}, ${sql.json(JSON.parse(JSON.stringify(table)))}::jsonb)`;
    await expect(
      as(a, async (tx) => {
        await tx`select pvp_test.pool_prepare_shot(${made.match_id}, ${tx.json({ angleMilli: 0, power: 1000, calledPocket: null })}::jsonb, ${randomUUID()})`;
      }),
    ).rejects.toThrow(/BAD_SHOT/);
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
