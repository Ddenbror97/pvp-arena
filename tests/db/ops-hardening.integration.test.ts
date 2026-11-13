/**
 * Retention, profile history guard and game-feed broadcast triggers.
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { applyTestSchema } from "./schema";
import { creditUserDeposit, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const sql = postgres(testDatabaseUrl(), {
  max: 4,
  prepare: false,
  onnotice: () => {},
  idle_timeout: 5,
});

let n = 0;
async function newUser() {
  const id = randomUUID();
  await sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${id}, true)`;
    await tx`select pvp_test.ensure_profile(${`ops${++n}${id.slice(0, 8)}`}, true)`;
  });
  return id;
}

describe("ops hardening (isolated schema)", () => {
  beforeAll(async () => {
    await applyTestSchema(sql);
    await migrateTestSchemaToReal(sql);
  }, 240_000);
  afterAll(async () => {
    await sql.end();
  });

  it("audit_logs stays immutable outside retention, and retention removes only expired lifecycle rows", async () => {
    const rows = await sql`
      insert into pvp_test.audit_logs (action, game_type, game_id, details, created_at) values
        ('ROUND_CREATED', 'roulette', 1, '{}', now() - interval '10 days'),
        ('ROUND_COMPLETED', 'roulette', 1, '{}', now() - interval '2 days'),
        ('BET_ACCEPTED', 'roulette', 1, '{}', now() - interval '10 days'),
        ('ROUND_CREATED', 'jackpot', 1, '{}', now() - interval '10 days'),
        ('prestige_page_viewed', 'jackpot', null, '{}', now() - interval '40 days'),
        ('promo_claimed', 'jackpot', null, '{}', now() - interval '400 days')
      returning id, action, game_type`;
    const ids = rows.map((r) => Number(r.id));
    const [expiredLifecycle, , bet, , pageView] = ids;

    await expect(
      sql`delete from pvp_test.audit_logs where id = ${expiredLifecycle}`,
    ).rejects.toThrow(/IMMUTABLE_RECORD/);
    await expect(
      sql`update pvp_test.audit_logs set details = '{"x":1}' where id = ${expiredLifecycle}`,
    ).rejects.toThrow(/IMMUTABLE_RECORD/);
    // The flag alone does not open the table: a kept row still cannot be deleted.
    await expect(
      sql.begin(async (tx) => {
        await tx`select set_config('pvp.audit_retention', 'on', true)`;
        await tx`delete from pvp_test.audit_logs where id = ${bet}`;
      }),
    ).rejects.toThrow(/IMMUTABLE_RECORD/);

    const [r] = await sql`select pvp_test.ops_retention() r`;
    expect(r.r.audit_logs).toBeGreaterThanOrEqual(2);
    const left = await sql`select id from pvp_test.audit_logs where id = any(${ids}::bigint[])`;
    const kept = new Set(left.map((x) => Number(x.id)));
    expect(kept.has(expiredLifecycle)).toBe(false);
    expect(kept.has(pageView)).toBe(false);
    expect(kept.size).toBe(4);
  });

  it("chat retention keeps recent and moderated messages", async () => {
    const u = await newUser();
    const [oldPlain, oldModerated, recent] = await sql`
      insert into pvp_test.game_chat_messages (game_type, user_id, message, created_at) values
        ('jackpot', ${u}, 'old', now() - interval '100 days'),
        ('jackpot', ${u}, 'old flagged', now() - interval '100 days'),
        ('jackpot', ${u}, 'new', now() - interval '1 day')
      returning id`;
    await sql`insert into pvp_test.game_chat_moderation_events (message_id, user_id, action) values (${oldModerated.id}, ${u}, 'HIDDEN')`;
    await sql`select pvp_test.ops_retention()`;
    const left =
      await sql`select id from pvp_test.game_chat_messages where id = any(${[oldPlain.id, oldModerated.id, recent.id]}::uuid[])`;
    expect(left.map((x) => x.id).sort()).toEqual([oldModerated.id, recent.id].sort());
  });

  it("FPS retention removes old finished practice sessions and the helper rows of old finished duels", async () => {
    const u = await newUser();
    const practice = await sql`
      insert into pvp_test_fps_private.practice_matches (owner_id, request_key, status, created_at) values
        (${u}, 'retention-old-done', 'COMPLETED', now() - interval '31 days'),
        (${u}, 'retention-old-cancelled', 'CANCELLED', now() - interval '45 days'),
        (${u}, 'retention-recent-done', 'COMPLETED', now() - interval '29 days'),
        (${u}, 'retention-live', 'FUNDED', now() - interval '40 days')
      returning id, request_key`;
    const id = (key: string) => practice.find((r) => r.request_key === key)!.id as string;
    // Duels: finished long ago, finished yesterday, and still waiting since long ago.
    const duel = async (status: string, created: string, completed: string | null) => {
      const [m] = await sql`
        insert into pvp_test.fps_matches (creator_id, stake, best_of, status, reason, created_at, completed_at)
        values (${u}, 0, 5, ${status}, ${status === "CANCELLED" ? "TEST" : null},
          now() - ${created}::interval, ${completed ? sql`now() - ${completed}::interval` : null})
        returning id`;
      await sql`insert into pvp_test_fps_private.waiting_presence (match_id) values (${m!.id})`;
      await sql`insert into pvp_test_fps_private.ready_windows (match_id, deadline) values (${m!.id}, now())`;
      return m!.id as string;
    };
    const oldDone = await duel("CANCELLED", "20 days", "8 days");
    const recentDone = await duel("CANCELLED", "20 days", "1 day");
    const waiting = await duel("WAITING", "20 days", null);

    const [r] = await sql`select pvp_test.ops_retention() r`;
    expect(r!.r.fps_rows).toBeGreaterThanOrEqual(4);

    const left =
      await sql`select id from pvp_test_fps_private.practice_matches where owner_id = ${u}`;
    expect(left.map((x) => x.id).sort()).toEqual(
      [id("retention-recent-done"), id("retention-live")].sort(),
    );
    for (const table of ["waiting_presence", "ready_windows"]) {
      const kept = await sql`select match_id from ${sql(`pvp_test_fps_private.${table}`)}
        where match_id = any(${[oldDone, recentDone, waiting]}::uuid[])`;
      expect(kept.map((x) => x.match_id).sort(), table).toEqual([recentDone, waiting].sort());
    }
    // The duels themselves are records and stay.
    const matches =
      await sql`select id from pvp_test.fps_matches where id = any(${[oldDone, recentDone, waiting]}::uuid[])`;
    expect(matches).toHaveLength(3);
    // Not callable by any API role.
    for (const role of ["anon", "authenticated", "service_role"]) {
      const [p] =
        await sql`select has_function_privilege(${role}, 'pvp_test_fps_private.prune(integer)', 'execute') x`;
      expect(p!.x, role).toBe(false);
    }
    await expect(sql`select pvp_test_fps_private.prune(0)`).rejects.toThrow(/INVALID_LIMIT/);
  });

  it("a profile with ledger history cannot be deleted; one without can", async () => {
    const funded = await newUser();
    await sql.begin((tx) => creditUserDeposit(tx, funded, 500));
    await expect(sql`delete from pvp_test.profiles where id = ${funded}`).rejects.toThrow(
      /PROFILE_HAS_LEDGER_HISTORY/,
    );
    const empty = await newUser();
    await sql`delete from pvp_test.profiles where id = ${empty}`;
    expect((await sql`select 1 from pvp_test.profiles where id = ${empty}`).length).toBe(0);
  });

  it("feed broadcast triggers are installed and never block the write", async () => {
    const triggers = await sql`
      select t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
      where t.tgname like '%feed' and c.relnamespace = 'pvp_test'::regnamespace`;
    expect(triggers.map((x) => x.tgname).sort()).toEqual(
      [
        "coinflip_games_feed",
        "jackpot_games_feed",
        "jackpot_players_feed",
        "poker_tables_feed",
        "roulette_games_feed",
        "slot_games_feed",
        "wallet_accounts_feed",
      ].sort(),
    );
    const u = await newUser();
    await sql.begin((tx) => creditUserDeposit(tx, u, 300));
    const [w] = await sql`
      select balance from pvp_test.wallet_accounts
      where owner_id = ${u} and kind = 'user_available' and account_type = 'real'`;
    expect(Number(w.balance)).toBe(300);
  });
});
