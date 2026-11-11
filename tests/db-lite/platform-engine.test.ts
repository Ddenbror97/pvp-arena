import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { liteDatabase } from "./schema";

/**
 * Platform audit 2026-11-10: idle ticks stop writing (20261110233000) and roulette rounds
 * nobody bet on are pruned after 14 days (20261110234000). Runs every migration in PGlite.
 */
let db: PGlite;
const one = async <T>(sql: string) => (await db.query<{ v: T }>(sql)).rows[0]!.v;
const beat = (name: string) =>
  one<string>(`select last_run_at::text v from pvp_test.worker_tick_gate where name = '${name}'`);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const raises = async (sql: string) =>
  db.exec(sql).then(
    () => "",
    (e: Error) => e.message,
  );

/** Ticks roulette until `n` rounds are finished (one-second betting, 200 ms spin). */
async function finishRounds(n: number) {
  for (let i = 0; i < 200; i++) {
    await db.exec("select pvp_test.roulette_tick()");
    const done = await one<number>(
      "select count(*)::int v from pvp_test.roulette_games where status = 'COMPLETED'",
    );
    if (done >= n) return;
    await pause(120);
  }
  throw new Error("roulette rounds did not finish");
}

beforeAll(async () => {
  db = await liteDatabase();
  await db.exec("update pvp_test.roulette_config set betting_seconds = 1, spin_ms = 200");
}, 120_000);

describe("one-second ticks while nobody plays", () => {
  it("write the heartbeat once, then only every few seconds", async () => {
    for (const [name, call] of [
      ["coinflip", "select pvp_test.coinflip_tick()"],
      ["jackpot", "select pvp_test.jackpot_tick()"],
      ["slot", "call pvp_test.slot_tick_worker()"],
    ] as const) {
      expect(await beat(name)).toBe("-infinity");
      await db.exec(call);
      const first = await beat(name);
      expect(first).not.toBe("-infinity");
      await db.exec(call);
      await db.exec(call);
      expect(await beat(name)).toBe(first);
      // A heartbeat older than four seconds is refreshed by the next idle run.
      await db.exec(
        `update pvp_test.worker_tick_gate set last_run_at = clock_timestamp() - interval '5 seconds' where name = '${name}'`,
      );
      await db.exec(call);
      expect(Date.now() - Date.parse(await beat(name))).toBeLessThan(2000);
    }
  });

  it("leave the poker stats row alone until something happens or four seconds pass", async () => {
    const before = await one<string>("select run_at::text v from pvp_test.poker_worker_stats");
    await db.exec("call pvp_test.slot_tick_worker()");
    expect(await one<string>("select run_at::text v from pvp_test.poker_worker_stats")).toBe(
      before,
    );
    await db.exec(
      "update pvp_test.poker_worker_stats set run_at = clock_timestamp() - interval '5 seconds'",
    );
    await db.exec("call pvp_test.slot_tick_worker()");
    expect(
      Date.now() -
        Date.parse(await one<string>("select run_at::text v from pvp_test.poker_worker_stats")),
    ).toBeLessThan(2000);
  });

  it("keep the workers' health check quiet", async () => {
    await db.exec("select pvp_test.roulette_tick()");
    const health = await one<{ stale: number; stuck: number }>(
      "select pvp_test.settlement_worker_health() v",
    );
    expect(health).toMatchObject({ stale: 0, stuck: 0 });
  });
});

describe("roulette keeps spinning and empty rounds are pruned", () => {
  it("plays rounds end to end with nobody there, with a heartbeat on every step", async () => {
    await finishRounds(1);
    await db.exec(
      "update pvp_test.worker_tick_gate set last_run_at = clock_timestamp() - interval '2 seconds' where name = 'roulette'",
    );
    await finishRounds(3);
    // Steps were taken inside the four-second idle window: work writes the heartbeat at once.
    expect(Date.now() - Date.parse(await beat("roulette"))).toBeLessThan(1500);
    const rounds = await one<number>(
      "select count(*)::int v from pvp_test.roulette_games where status = 'COMPLETED' and bet_count = 0",
    );
    expect(rounds).toBeGreaterThanOrEqual(3);
    expect(
      await one<number>(
        "select count(*)::int v from pvp_test.roulette_results r join pvp_test.roulette_game_secrets s using (game_id)",
      ),
    ).toBeGreaterThanOrEqual(3);
  }, 60_000);

  it("deletes only finished rounds without a bet that are older than 14 days", async () => {
    const ids = (
      await db.query<{ id: number }>(
        "select id::int id from pvp_test.roulette_games where status = 'COMPLETED' order by id limit 3",
      )
    ).rows.map((r) => r.id);
    const [oldEmpty, oldWithBet, recent] = ids as [number, number, number];
    // Fixture only: age two rounds and give one of them a bet count (the guards forbid both).
    await db.exec(`
      alter table pvp_test.roulette_games disable trigger roulette_game_guard;
      update pvp_test.roulette_games set completed_at = now() - interval '15 days' where id in (${oldEmpty}, ${oldWithBet});
      update pvp_test.roulette_games set bet_count = 1, pot_amount = 100 where id = ${oldWithBet};
      alter table pvp_test.roulette_games enable trigger roulette_game_guard;`);

    // Nobody deletes a round by hand, old and empty or not.
    expect(await raises(`delete from pvp_test.roulette_games where id = ${oldEmpty}`)).toContain(
      "IMMUTABLE_RECORD",
    );
    expect(
      await raises(`delete from pvp_test.roulette_results where game_id = ${oldEmpty}`),
    ).toContain("IMMUTABLE_RECORD");
    expect(
      await raises(
        `update pvp_test.roulette_game_secrets set server_seed = server_seed where game_id = ${oldEmpty}`,
      ),
    ).toContain("IMMUTABLE_RECORD");
    // Even with the retention flag, a round with a bet and a recent round stay.
    for (const id of [oldWithBet, recent]) {
      expect(
        await raises(
          `begin; select set_config('pvp.roulette_retention','on',true); delete from pvp_test.roulette_results where game_id = ${id}; commit;`,
        ),
      ).toContain("IMMUTABLE_RECORD");
      await db.exec("rollback");
      expect(
        await raises(
          `begin; select set_config('pvp.roulette_retention','on',true); delete from pvp_test.roulette_games where id = ${id}; commit;`,
        ),
      ).toContain("IMMUTABLE_RECORD");
      await db.exec("rollback");
    }

    const report = await one<{ roulette_rounds: number }>("select pvp_test.ops_retention() v");
    expect(report.roulette_rounds).toBe(1);
    const left = (
      await db.query<{ id: number }>(
        `select id::int id from pvp_test.roulette_games where id in (${ids.join(",")}) order by id`,
      )
    ).rows.map((r) => r.id);
    expect(left).toEqual([oldWithBet, recent].sort((a, b) => a - b));
    for (const table of ["roulette_results", "roulette_game_secrets"])
      expect(
        await one<number>(
          `select count(*)::int v from pvp_test.${table} where game_id = ${oldEmpty}`,
        ),
      ).toBe(0);
    // The retention flag does not outlive the job.
    expect(
      await one<string>("select coalesce(current_setting('pvp.roulette_retention', true), '') v"),
    ).not.toBe("on");
    // A second run finds nothing, and the integrity check passes over the gap.
    expect(
      (await one<{ roulette_rounds: number }>("select pvp_test.ops_retention() v")).roulette_rounds,
    ).toBe(0);
    await db.exec("select pvp_test.roulette_integrity_check()");
    // The check passes over the gap: its only findings are about the fixture round that was
    // given a bet count without bets.
    const findings = (
      await db.query<{ check_name: string; fingerprint: string }>(
        "select check_name, fingerprint from pvp_test.integrity_incidents where check_name like 'roulette%'",
      )
    ).rows;
    for (const f of findings) expect(f.fingerprint).toMatch(new RegExp(`:${oldWithBet}$`));
    await finishRounds(4);
  }, 60_000);
});
