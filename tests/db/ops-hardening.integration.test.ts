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
