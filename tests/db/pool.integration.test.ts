/**
 * Pool ledger and rules-hash parity against the isolated schema.
 * The winner paid here is the seat the rules named. Fee is 5% of the pot.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { testDatabaseUrl } from "./test-url";
import { playShot } from "../../src/lib/pool/play";
import { PHYSICS_V7, PHYSICS_V8, POCKETS, TABLE_H, TABLE_W } from "../../src/lib/pool/physics";
import { applyTimeout, freshTable, stateHash, type TableState } from "../../src/lib/pool/rules";
import { bytesFromHex, tableLinks } from "../../src/lib/pool/verify";

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

function asJson(value: unknown) {
  return sql.json(JSON.parse(JSON.stringify(value)));
}

async function beginReal(matchId: number): Promise<TableState> {
  const [secret] = await sql`select pvp_test.pool_read_secret(${matchId}) seed`;
  const table = freshTable(bytesFromHex(String(secret.seed)));
  // These racks are two present players. An unseen creator would be played by the table.
  await sql`
    update pvp_test.pool_matches
    set seen_a = clock_timestamp(), seen_b = clock_timestamp()
    where id = ${matchId}
  `;
  await sql`select pvp_test.pool_begin(${matchId}, ${asJson(table)}::jsonb)`;
  return table;
}

const bal = async (uid: string, kind = "user_available") =>
  Number(
    (
      await sql`select balance from pvp_test.wallet_accounts where owner_id = ${uid} and kind = ${kind} and account_type = 'test_credit'`
    )[0].balance,
  );

async function sit(uid: string, matchId: number, key = randomUUID()) {
  return as(uid, async (tx) => {
    const [row] = await tx`select pvp_test.pool_join(${matchId}, ${key}) r`;
    return row.r as { match_id: number; role: string; duplicate: boolean };
  });
}

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
    const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 3);
    const [fresh] =
      await sql`select pvp_test.pool_state_hash(pvp_test.pool_fresh_state(decode(${Buffer.from(seed).toString("hex")}, 'hex'))) h`;
    expect(fresh.h).toBe(stateHash(freshTable(seed)));
  });

  it("agrees with SQL when a straight ball crosses each jaw", async () => {
    const aim = (pocketId: number, physics: TableState["physics"]) => {
      const pocket = POCKETS[pocketId];
      if (!pocket) throw new Error("pocket");
      const dx = pocket.x - TABLE_W / 2;
      const dy = pocket.y - TABLE_H / 2;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const x = Math.round(pocket.x - ux * 350_000);
      const y = Math.round(pocket.y - uy * 350_000);
      const angle = Math.round((Math.atan2(pocket.y - y, pocket.x - x) * 180_000) / Math.PI);
      const state = freshTable(Uint8Array.from({ length: 32 }, (_, i) => i + 11));
      state.physics = physics;
      state.breakShot = false;
      state.ballInHand = false;
      state.kitchenOnly = false;
      for (const ball of state.balls) {
        if (ball.id !== 0) ball.pocketed = true;
        if (ball.id === 0) {
          ball.x = x;
          ball.y = y;
          ball.pocketed = false;
        }
      }
      return {
        state,
        shot: {
          angleMilli: ((angle % 360_000) + 360_000) % 360_000,
          power: 6_000,
          spinX: 0,
          spinY: 0,
          placeX: null,
          placeY: null,
          calledPocket: null,
        },
      };
    };
    const agree = async (pocketId: number, physics: TableState["physics"]) => {
      const { state, shot } = aim(pocketId, physics);
      const played = playShot(state, shot);
      expect(played.ok).toBe(true);
      if (!played.ok) return;
      const [row] = await sql`
        select pvp_test.pool_state_canon(pvp_test.pool_play(${asJson(state)}::jsonb, ${asJson(shot)}::jsonb)) as sql_canon,
               pvp_test.pool_state_canon(${asJson(played.state)}::jsonb) as ts_canon
      `;
      expect(row.sql_canon).toBe(row.ts_canon);
      const cue = played.state.balls.find((ball) => ball.id === 0);
      if (physics === PHYSICS_V8) expect(cue?.pocketed).toBe(true);
      if (physics === PHYSICS_V7 && (pocketId === 0 || pocketId === 3 || pocketId === 5)) {
        expect(cue?.pocketed).toBe(false);
      }
    };
    for (const id of [0, 1, 2, 3, 4, 5]) await agree(id, PHYSICS_V8);
    await agree(5, PHYSICS_V7);
    await agree(0, PHYSICS_V7);
  });

  it("locks a stake, refunds an empty wait, and pays 95% with a 5% fee", async () => {
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
    const [life] = await sql`
      select extract(epoch from (expires_at - created_at))::int secs
      from pvp_test.pool_matches where id = ${created.match_id}
    `;
    expect(life.secs).toBe(86400);
    await expect(
      as(a, async (tx) => {
        await tx`select pvp_test.pool_cancel(${created.match_id})`;
      }),
    ).rejects.toThrow(/CANCEL_DISABLED/);

    await sql`
      update pvp_test.pool_matches
      set expires_at = clock_timestamp() - interval '1 second'
      where id = ${created.match_id}
    `;
    const [expired] = await sql`select pvp_test._pool_tick_one(${created.match_id}) r`;
    expect(expired.r).toBe("refunded");
    expect(await bal(a)).toBe(before);
    expect(await bal(a, "user_locked")).toBe(0);

    const again = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    const joinKey = randomUUID();
    const joined = await sit(b, again.match_id, joinKey);
    expect(joined.role).toBe("joined");
    expect(Number(joined.match_id)).toBe(again.match_id);
    const retried = await sit(b, again.match_id, joinKey);
    expect(retried.duplicate).toBe(true);
    expect(retried.role).toBe("joined");
    expect(retried.match_id).toBe(again.match_id);
    expect(await bal(b, "user_locked")).toBe(100);

    const table = await beginReal(joined.match_id);
    const [started] =
      await sql`select state_hash, status from pvp_test.pool_matches where id = ${joined.match_id}`;
    expect(started.status).toBe("PLAYING");
    expect(started.state_hash).toBe(stateHash(table));
    await sql`select pvp_test.pool_forfeit_seat(${joined.match_id}, 'B')`;

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

    await sql`select pvp_test.pool_forfeit_seat(${joined.match_id}, 'B')`;
    const closed = await as(b, async (tx) => {
      const [row] = await tx`select pvp_test.pool_forfeit(${joined.match_id}) r`;
      return row.r as { forfeited: boolean };
    });
    expect(closed.forfeited).toBe(false);
    const [once] =
      await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${joined.match_id} and kind = 'pool_settlement'`;
    expect(once.c).toBe(1);
  });

  it("forfeits a live table to the opponent instead of returning 90%", async () => {
    const a = await newUser("lea");
    const b = await newUser("lee");
    const stranger = await newUser("leo");
    const beforeA = await bal(a);
    const beforeB = await bal(b);
    const waiting = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    const stillWaiting = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_leave(${waiting.match_id}) r`;
      return row.r as { left: boolean };
    });
    expect(stillWaiting.left).toBe(false);
    expect(await bal(a)).toBe(beforeA - 100);

    const joined = await sit(b, waiting.match_id);
    expect(joined.role).toBe("joined");
    expect(Number(joined.match_id)).toBe(waiting.match_id);
    await beginReal(joined.match_id);
    await expect(
      as(stranger, async (tx) => {
        await tx`select pvp_test.pool_leave(${joined.match_id})`;
      }),
    ).rejects.toThrow(/FORBIDDEN/);

    await sql`insert into pvp_test.pool_pending (match_id, seq, user_id, idempotency_key, input)
      values (${joined.match_id}, 1, ${a}, ${randomUUID()}, '{"angleMilli":0,"power":1}'::jsonb)`;
    const left = await as(b, async (tx) => {
      const [row] = await tx`select pvp_test.pool_leave(${joined.match_id}) r`;
      return row.r as { left: boolean; forfeited: boolean };
    });
    expect(left.left).toBe(true);
    expect(left.forfeited).toBe(true);

    const [committed] = await sql`
      select pvp_test.pool_commit_shot(
        ${joined.match_id}, 1, '{"winner":"A","reason":"EIGHT_BALL"}'::jsonb, 'forged', '{}'::jsonb
      ) r
    `;
    expect(committed.r.duplicate).toBe(true);

    const [done] = await sql`
      select status, cancel_reason, left_by, winner_id, win_reason, fee_amount, payout_amount
      from pvp_test.pool_matches where id = ${joined.match_id}
    `;
    expect(done.status).toBe("COMPLETED");
    expect(done.cancel_reason).toBeNull();
    expect(done.left_by).toBe(b);
    expect(done.winner_id).toBe(a);
    expect(done.win_reason).toBe("FORFEIT");
    expect(Number(done.fee_amount)).toBe(10);
    expect(Number(done.payout_amount)).toBe(190);
    expect(await bal(a)).toBe(beforeA + 90);
    expect(await bal(b)).toBe(beforeB - 100);
    expect(await bal(a, "user_locked")).toBe(0);
    expect(await bal(b, "user_locked")).toBe(0);

    const [view] = await sql`select pvp_test.pool_state(${joined.match_id}) s`;
    expect(view.s.left_by).toBe(b);
    expect(view.s.status).toBe("COMPLETED");
    expect(view.s.winner_id).toBe(a);
    expect(view.s.win_reason).toBe("FORFEIT");

    const [payouts] = await sql`
      select count(*)::int c, coalesce(sum(amount + fee), 0)::bigint s
      from pvp_test.pool_payouts where match_id = ${joined.match_id}
    `;
    expect(payouts.c).toBe(1);
    expect(Number(payouts.s)).toBe(200);

    const again = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_leave(${joined.match_id}) r`;
      return row.r as { left: boolean };
    });
    expect(again.left).toBe(false);
    const [refunds] = await sql`
      select count(*)::int c from pvp_test.ledger_transactions
      where game_id = ${joined.match_id} and kind = 'pool_refund'
    `;
    expect(refunds.c).toBe(0);
    await sql`select pvp_test.pool_forfeit_seat(${joined.match_id}, 'B')`;
    const [once] = await sql`
      select count(*)::int c from pvp_test.ledger_transactions
      where game_id = ${joined.match_id} and kind = 'pool_settlement'
    `;
    expect(once.c).toBe(1);
    const [rated] = await sql`
      select count(*)::int c from pvp_test.pool_ratings
      where user_id in (${a}, ${b}) and games > 0
    `;
    expect(rated.c).toBe(2);
    const [pending] = await sql`
      select count(*)::int c from pvp_test.pool_pending where match_id = ${joined.match_id}
    `;
    expect(pending.c).toBe(0);

    const oddA = await newUser("oda");
    const oddB = await newUser("odb");
    const oddBeforeA = await bal(oddA);
    const oddBeforeB = await bal(oddB);
    const opened = await as(oddA, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(101, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    const odd = await sit(oddB, opened.match_id);
    await beginReal(odd.match_id);
    const oddLeft = await as(oddA, async (tx) => {
      const [row] = await tx`select pvp_test.pool_leave(${odd.match_id}) r`;
      return row.r as { left: boolean; forfeited: boolean };
    });
    expect(oddLeft.left).toBe(true);
    expect(oddLeft.forfeited).toBe(true);
    expect(await bal(oddA)).toBe(oddBeforeA - 101);
    expect(await bal(oddB)).toBe(oddBeforeB + 91);

    const [books] =
      await sql`select coalesce(sum(balance), 0)::bigint s from pvp_test.wallet_accounts`;
    expect(Number(books.s)).toBe(0);
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
    await sit(b, made.match_id);
    const table = await beginReal(made.match_id);
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
    await sit(b, made.match_id);
    const [starting] = await sql`select pvp_test.pool_state(${made.match_id}) s`;
    expect(starting.s.status).toBe("STARTING");
    expect(starting.s.server_seed).toBeNull();
    expect(typeof starting.s.server_seed_hash).toBe("string");

    const secret = await sql`select pvp_test.pool_read_secret(${made.match_id}) seed`;
    await beginReal(made.match_id);
    const [live] = await sql`select pvp_test.pool_state(${made.match_id}) s`;
    expect(live.s.status).toBe("PLAYING");
    expect(live.s.server_seed).toBe(secret[0].seed);
    expect(live.s.server_seed_hash).toBe(starting.s.server_seed_hash);
  });

  it("rejects a forged rack and a self-consistent wrong winner", async () => {
    const a = await newUser("iris");
    const b = await newUser("jules");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    const forgedRack = freshTable(new Uint8Array(32).fill(6));
    await expect(
      sql`select pvp_test.pool_begin(${made.match_id}, ${asJson(forgedRack)}::jsonb)`,
    ).rejects.toThrow(/BAD_RACK/);
    const [starting] =
      await sql`select status from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(starting.status).toBe("STARTING");

    const table = await beginReal(made.match_id);
    const cue = table.balls.find((ball) => ball.id === 0);
    if (!cue) throw new Error("missing cue");
    const shot = {
      angleMilli: 0,
      power: 6500,
      spinX: 200,
      spinY: -150,
      placeX: cue.x,
      placeY: cue.y,
      calledPocket: null,
      key: randomUUID(),
    };
    const played = playShot(table, shot);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    const forged = {
      ...played.state,
      winner: "A" as const,
      reason: "EIGHT_BALL",
      turn: "B" as const,
    };
    const forgedHash = stateHash(forged);
    expect(forgedHash).toBe(stateHash(forged));
    const shifted = {
      ...played.state,
      balls: played.state.balls.map((ball) => (ball.id === 0 ? { ...ball, x: ball.x + 1 } : ball)),
    };
    const shiftedHash = stateHash(shifted);
    expect(shiftedHash).not.toBe(played.hash);
    await sql`insert into pvp_test.pool_pending (match_id, seq, user_id, idempotency_key, input)
      values (${made.match_id}, 1, ${a}, ${shot.key}, ${asJson(shot)}::jsonb)`;
    await expect(
      sql`select pvp_test.pool_commit_shot(${made.match_id}, 1, ${asJson(forged)}::jsonb, ${forgedHash}, '{}'::jsonb)`,
    ).rejects.toThrow(/RESULT_MISMATCH/);
    await expect(
      sql`select pvp_test.pool_commit_shot(${made.match_id}, 1, ${asJson(shifted)}::jsonb, ${shiftedHash}, '{}'::jsonb)`,
    ).rejects.toThrow(/RESULT_MISMATCH/);
    const tampered = {
      ...table,
      balls: table.balls.map((ball) => (ball.id === 0 ? { ...ball, x: ball.x + 50 } : ball)),
    };
    await sql`update pvp_test.pool_matches set state = ${asJson(tampered)}::jsonb where id = ${made.match_id}`;
    await expect(
      sql`select pvp_test.pool_commit_shot(${made.match_id}, 1, ${asJson(played.state)}::jsonb, ${played.hash}, '{}'::jsonb)`,
    ).rejects.toThrow(/STATE_DIVERGED/);
    await sql`update pvp_test.pool_matches set state = ${asJson(table)}::jsonb where id = ${made.match_id}`;
    const [still] = await sql`select status from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(still.status).toBe("PLAYING");
    const [paid] =
      await sql`select count(*)::int c from pvp_test.ledger_transactions where game_id = ${made.match_id} and kind = 'pool_settlement'`;
    expect(paid.c).toBe(0);

    await sql`select pvp_test.pool_commit_shot(${made.match_id}, 1, ${asJson(played.state)}::jsonb, ${played.hash}, ${asJson(played.event)}::jsonb)`;
    const [row] =
      await sql`select state, state_hash, winner_id from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(row.state_hash).toBe(played.hash);
    const stored = row.state as TableState;
    expect(stateHash(stored)).toBe(played.hash);
    const [secretRow] = await sql`select pvp_test.pool_read_secret(${made.match_id}) seed`;
    const rackSeed = bytesFromHex(String(secretRow.seed));
    expect(tableLinks(rackSeed, stored, [{ kind: "shot", input: shot, hash: played.hash }])).toBe(
      true,
    );
    if (played.state.winner == null) {
      const cue2 = stored.balls.find((ball) => ball.id === 0 && !ball.pocketed);
      const shot2 = {
        angleMilli: 40_000,
        power: 3_500,
        spinX: 0,
        spinY: 0,
        placeX: stored.ballInHand ? (cue2?.x ?? null) : null,
        placeY: stored.ballInHand ? (cue2?.y ?? null) : null,
        calledPocket: null,
        key: randomUUID(),
      };
      const second = playShot(stored, shot2);
      if (second.ok) {
        await sql`insert into pvp_test.pool_pending (match_id, seq, user_id, idempotency_key, input)
          values (${made.match_id}, 2, ${a}, ${shot2.key}, ${asJson(shot2)}::jsonb)`;
        await sql`select pvp_test.pool_commit_shot(${made.match_id}, 2, ${asJson(second.state)}::jsonb, ${second.hash}, ${asJson(second.event)}::jsonb)`;
        const [later] =
          await sql`select state_hash from pvp_test.pool_matches where id = ${made.match_id}`;
        expect(later.state_hash).toBe(second.hash);
      }
    }
    if (played.state.winner == null) expect(row.winner_id).toBeNull();
    else expect(row.winner_id).toBe(played.state.winner === "A" ? a : b);
  }, 60_000);

  it("pays 95 percent at every stake and refuses a second settlement", async () => {
    const waiting =
      await sql`select id, creator_id from pvp_test.pool_matches where status = 'WAITING'`;
    for (const open of waiting) {
      await sql`
        update pvp_test.pool_matches
        set expires_at = clock_timestamp() - interval '1 second'
        where id = ${open.id} and status = 'WAITING'
      `;
      await sql`select pvp_test._pool_tick_one(${open.id})`;
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
      const joined = await sit(b, made.match_id);
      expect(joined.role).toBe("joined");
      expect(Number(joined.match_id)).toBe(made.match_id);
      await beginReal(made.match_id);
      await sql`select pvp_test.pool_forfeit_seat(${made.match_id}, 'A')`;
      const pot = stake * 2;
      const fee = Math.floor((pot * 500) / 10000);
      const [done] =
        await sql`select fee_amount, payout_amount, winner_id from pvp_test.pool_matches where id = ${made.match_id}`;
      expect(Number(done.fee_amount)).toBe(fee);
      expect(Number(done.payout_amount)).toBe(pot - fee);
      expect(done.winner_id).toBe(b);
      expect(await bal(a)).toBe(beforeA - stake);
      expect(await bal(b)).toBe(beforeB - stake + (pot - fee));
      await sql`select pvp_test.pool_forfeit_seat(${made.match_id}, 'A')`;
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
    await sit(b, made.match_id);
    await beginReal(made.match_id);
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

  it("forfeits only when both seats have gone quiet after a shot", async () => {
    const a = await newUser("nora");
    const b = await newUser("otto");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    await beginReal(made.match_id);
    await as(a, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    await as(b, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    await sql`update pvp_test.pool_matches set turn_deadline = clock_timestamp() + interval '20 seconds'
      where id = ${made.match_id}`;
    const [live] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(live.r).toBe("waiting");

    await sql`update pvp_test.pool_matches set
      state = jsonb_set(state, '{shot}', '1'::jsonb),
      seen_a = clock_timestamp() - interval '181 seconds',
      seen_b = clock_timestamp() - interval '181 seconds'
      where id = ${made.match_id}`;
    const [gone] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(gone.r).toBe("forfeit_absent");
    const [done] =
      await sql`select status, win_reason, winner_id from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(done.status).toBe("COMPLETED");
    expect(done.win_reason).toBe("FORFEIT");
    expect(done.winner_id).toBe(b);
  });

  it("keeps the server clock when a player heartbeats, and does not abandon a live seat", async () => {
    const a = await newUser("pia");
    const b = await newUser("quin");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    await beginReal(made.match_id);
    await as(a, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    await as(b, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    const [before] =
      await sql`select turn_deadline from pvp_test.pool_matches where id = ${made.match_id}`;
    await as(a, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    const [refreshed] =
      await sql`select turn_deadline from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(new Date(refreshed.turn_deadline).getTime()).toBe(
      new Date(before.turn_deadline).getTime(),
    );

    await sql`update pvp_test.pool_matches set
      seen_b = clock_timestamp() - interval '181 seconds',
      turn_deadline = clock_timestamp() + interval '20 seconds'
      where id = ${made.match_id}`;
    const [oneLive] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(oneLive.r).toBe("waiting");

    await sql`update pvp_test.pool_matches set
      seen_a = clock_timestamp(),
      turn_deadline = clock_timestamp() - interval '1 second'
      where id = ${made.match_id}`;
    const [clock] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(clock.r).toBe("held");
    const [row] =
      await sql`select status, win_reason, state, turn_deadline from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(row.status).toBe("PLAYING");
    expect(row.win_reason).toBeNull();
    expect(row.state.timeouts.A).toBe(0);
    expect(row.state.turn).toBe("A");
    expect(row.state.winner).toBeNull();
    expect(new Date(row.turn_deadline).getTime()).toBeGreaterThan(Date.now() + 20_000);
  });

  it("does not forfeit a seat that is still at the table", async () => {
    const a = await newUser("rhea");
    const b = await newUser("sol");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    await beginReal(made.match_id);
    for (let i = 0; i < 3; i++) {
      await sql`update pvp_test.pool_matches set
        seen_a = clock_timestamp(),
        turn_deadline = clock_timestamp() - interval '1 second'
        where id = ${made.match_id}`;
      const [tick] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
      expect(tick.r).toBe("held");
    }
    const [row] =
      await sql`select status, win_reason, state from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(row.status).toBe("PLAYING");
    expect(row.win_reason).toBeNull();
    expect(row.state.timeouts.A).toBe(0);
    expect(row.state.winner).toBeNull();
  });

  it("rejects a shot with no spin", async () => {
    const a = await newUser("mina");
    const b = await newUser("nils");
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    await beginReal(made.match_id);
    await expect(
      as(a, async (tx) => {
        await tx`select pvp_test.pool_prepare_shot(${made.match_id}, ${tx.json({ angleMilli: 0, power: 1000, calledPocket: null })}::jsonb, ${randomUUID()})`;
      }),
    ).rejects.toThrow(/BAD_SHOT/);
  });

  it("blocks service-role settlement shortcuts", async () => {
    const names = [
      "_pool_settle",
      "_pool_refund",
      "_pool_debit",
      "_pool_log_timeout",
      "_pool_tick_one",
      "_pool_request_stand_in",
      "pool_forfeit_seat",
      "pool_play",
      "pool_recorded_prior",
    ];
    const grants = await sql<{ proname: string; ok: boolean }[]>`
      select p.proname, has_function_privilege('service_role', p.oid, 'execute') ok
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'pvp_test' and p.proname = any(${names})
    `;
    expect(grants.map((row) => row.proname).sort()).toEqual([...names].sort());
    expect(grants.every((row) => row.ok === false)).toBe(true);
    const [table] = await sql<{ upd: boolean; secret: boolean }[]>`
      select has_table_privilege('service_role', 'pvp_test.pool_matches', 'UPDATE') upd,
             has_table_privilege('service_role', 'pvp_test.pool_secrets', 'SELECT') secret
    `;
    expect(table.upd).toBe(false);
    expect(table.secret).toBe(false);
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role service_role`;
        await tx`select pvp_test._pool_settle(1, ${randomUUID()}::uuid, 'FORGED')`;
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  it("leaves both creates open when two players pick the same stake", async () => {
    const a = await newUser("bigboy1");
    const b = await newUser("ddenbror");
    const first = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    const second = await as(b, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number; role: string };
    });
    expect(first.role).toBe("created");
    expect(second.role).toBe("created");
    expect(second.match_id).not.toBe(first.match_id);
    const rows = await sql`
      select id, status, opponent_id from pvp_test.pool_matches
      where id in (${first.match_id}, ${second.match_id})
    `;
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "WAITING" && row.opponent_id == null)).toBe(true);
    const [lobby] = await sql`select pvp_test.pool_lobby() lobby`;
    const open = (lobby.lobby.open as { id: number }[]).map((table) => Number(table.id));
    expect(open).toContain(Number(first.match_id));
    expect(open).toContain(Number(second.match_id));
  });

  it("joins the open table you pick and leaves the other waiting", async () => {
    const a = await newUser("sela");
    const c = await newUser("tomas");
    const d = await newUser("uma");
    const older = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    const newer = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    expect(newer.match_id).not.toBe(older.match_id);
    const [lobby] = await sql`select pvp_test.pool_lobby() lobby`;
    const open = lobby.lobby.open as { id: number; creator_id: string }[];
    expect(open.find((table) => Number(table.id) === newer.match_id)?.creator_id).toBe(a);
    await expect(
      as(a, async (tx) => {
        await tx`select pvp_test.pool_join(${older.match_id}, ${randomUUID()})`;
      }),
    ).rejects.toThrow(/OWN_TABLE/);

    const key = randomUUID();
    const joined = await as(c, async (tx) => {
      const [row] = await tx`select pvp_test.pool_join(${newer.match_id}, ${key}) r`;
      return row.r as { match_id: number; role: string; duplicate: boolean };
    });
    expect(joined.role).toBe("joined");
    expect(joined.duplicate).toBe(false);
    expect(Number(joined.match_id)).toBe(newer.match_id);
    const again = await as(c, async (tx) => {
      const [row] = await tx`select pvp_test.pool_join(${newer.match_id}, ${key}) r`;
      return row.r as { duplicate: boolean; match_id: number };
    });
    expect(again.duplicate).toBe(true);
    expect(Number(again.match_id)).toBe(newer.match_id);

    const [still] =
      await sql`select status from pvp_test.pool_matches where id = ${older.match_id}`;
    const [taken] =
      await sql`select status, opponent_id from pvp_test.pool_matches where id = ${newer.match_id}`;
    expect(still.status).toBe("WAITING");
    expect(taken.status).toBe("STARTING");
    expect(taken.opponent_id).toBe(c);
    expect(await bal(c, "user_locked")).toBe(100);

    await expect(
      as(d, async (tx) => {
        await tx`select pvp_test.pool_join(${newer.match_id}, ${randomUUID()})`;
      }),
    ).rejects.toThrow(/MATCH_NOT_OPEN/);
  });

  it("opens the rack when both players are present and waits when one is away", async () => {
    const a = await newUser("vera");
    const b = await newUser("walt");
    // Earlier cases leave an open table. This case sits at the table it just opened.
    await sql`update pvp_test.pool_matches set expires_at = clock_timestamp() - interval '1 second' where status = 'WAITING'`;
    await sql`select pvp_test.pool_tick()`;
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    const [held] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(held.r).toBe("idle");
    const [far] = await sql`select pvp_test.pool_state(${made.match_id}) s`;
    const wait = new Date(far.s.opens_at).getTime() - new Date(far.s.server_now).getTime();
    expect(wait).toBeGreaterThan(50_000);

    await as(b, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    const [one] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(one.r).toBe("idle");

    await sql`update pvp_test.pool_matches set
      seen_a = clock_timestamp() - interval '20 seconds',
      seen_b = clock_timestamp()
      where id = ${made.match_id}`;
    const [stale] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(stale.r).toBe("idle");

    await as(a, async (tx) => {
      await tx`select pvp_test.pool_touch(${made.match_id})`;
    });
    const [ready] = await sql`select pvp_test.pool_state(${made.match_id}) s`;
    const soon = new Date(ready.s.opens_at).getTime() - new Date(ready.s.server_now).getTime();
    expect(soon).toBeLessThan(2_000);
    const [opened] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(opened.r).toBe("opened");
    const [live] =
      await sql`select status, stand_in from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(live.status).toBe("PLAYING");
    expect(live.stand_in).toBeNull();
  });

  it("plays the break when the creator left before the rack opened", async () => {
    const a = await newUser("xenia");
    const b = await newUser("yorick");
    await sql`update pvp_test.pool_matches set expires_at = clock_timestamp() - interval '1 second' where status = 'WAITING'`;
    await sql`select pvp_test.pool_tick()`;
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    await sql`update pvp_test.pool_matches set
      seen_a = clock_timestamp() - interval '2 minutes',
      seen_b = clock_timestamp(),
      phase_at = clock_timestamp() - interval '61 seconds'
      where id = ${made.match_id}`;
    const [opened] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(opened.r).toBe("opened");
    const [live] = await sql`select stand_in, state,
      seen_a < clock_timestamp() - interval '60 seconds' as creator_still_away
      from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(live.stand_in).toBe("A");
    expect(live.creator_still_away).toBe(true);
    expect(live.state.turn).toBe("A");
    expect(live.state.ballInHand).toBe(true);
    expect(live.state.breakShot).toBe(true);
    const [held] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(held.r).toBe("waiting");
  });

  it("stands in for an opponent who never reached the table", async () => {
    const a = await newUser("zelda");
    const b = await newUser("anton");
    await sql`update pvp_test.pool_matches set expires_at = clock_timestamp() - interval '1 second' where status = 'WAITING'`;
    await sql`select pvp_test.pool_tick()`;
    const made = await as(a, async (tx) => {
      const [row] = await tx`select pvp_test.pool_matchmake(100, ${randomUUID()}) r`;
      return row.r as { match_id: number };
    });
    await sit(b, made.match_id);
    await sql`update pvp_test.pool_matches set
      seen_a = clock_timestamp(),
      seen_b = null,
      phase_at = clock_timestamp() - interval '61 seconds'
      where id = ${made.match_id}`;
    const [opened] = await sql`select pvp_test._pool_tick_one(${made.match_id}) r`;
    expect(opened.r).toBe("opened");
    const [live] = await sql`select stand_in, seen_b, state->>'turn' as turn
      from pvp_test.pool_matches where id = ${made.match_id}`;
    expect(live.stand_in).toBe("B");
    expect(live.seen_b).toBeNull();
    expect(live.turn).toBe("A");
  });

  it("walks live tables and skips when the tick is already running", async () => {
    const [tick] = await sql`select pvp_test.pool_tick() r`;
    const row = tick.r as { processed?: number; skipped?: string };
    expect(row.skipped === "busy" || Number(row.processed) >= 0).toBe(true);
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
