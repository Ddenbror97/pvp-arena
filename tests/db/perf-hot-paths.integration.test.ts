/**
 * Isolated catalog + plan checks for 20261012190000. Requires TEST_DATABASE_URL.
 * Does not connect to production and does not apply anything there.
 */
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { adminClaims, openAdminStepup } from "./admin-stepup";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});

d("perf hot paths", () => {
  it("rebuilds, indexes the justified keys, wraps the 28 policies, and keeps admin/integrity", async () => {
    await sql.unsafe(buildTestSchemaSql());

    const idx =
      await sql`select indexname from pg_indexes where schemaname = 'pvp_test' and indexname in (
        'audit_logs_fail_id_idx', 'jackpot_players_user_idx', 'roulette_payouts_bet_idx'
      ) order by 1`;
    expect(idx.map((r) => r.indexname)).toEqual(["audit_logs_fail_id_idx"]);

    const fkIdx =
      await sql`select indexname from pg_indexes where schemaname = 'pvp_test' and indexname in (
        'roulette_games_wheel_version_idx',
        'roulette_results_wheel_version_idx',
        'roulette_bets_ledger_tx_id_idx',
        'partner_referrals_acquisition_code_id_idx',
        'promo_wagers_user_id_idx',
        'crypto_deposit_addresses_user_id_idx'
      ) order by 1`;
    expect(fkIdx.map((r) => r.indexname)).toEqual([
      "crypto_deposit_addresses_user_id_idx",
      "partner_referrals_acquisition_code_id_idx",
      "promo_wagers_user_id_idx",
      "roulette_bets_ledger_tx_id_idx",
      "roulette_games_wheel_version_idx",
      "roulette_results_wheel_version_idx",
    ]);
    const [payoutPk] = await sql`
      select i.indisprimary
      from pg_index i
      join pg_class c on c.oid = i.indrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum = any (i.indkey)
      where n.nspname = 'pvp_test' and c.relname = 'roulette_payouts' and a.attname = 'bet_id'`;
    expect(payoutPk.indisprimary).toBe(true);

    const wrapped =
      await sql`select policyname from pg_policies
      where schemaname = 'pvp_test' and coalesce(qual, '') ilike '%test_uid%'
      order by policyname`;
    expect(wrapped.length).toBeGreaterThanOrEqual(28);

    const [tick] = await sql`select pvp_test.jackpot_tick() as r`;
    expect(tick.r).toEqual(expect.objectContaining({ settled: expect.anything() }));

    const [ic] = await sql`select pvp_test.roulette_integrity_check() as r`;
    expect(ic.r).toEqual(expect.objectContaining({ incidents: expect.anything() }));

    const [health] = await sql`
      select pg_get_functiondef('pvp_test.settlement_worker_health()'::regprocedure) as def`;
    expect(health.def).toContain("floor_id");
    expect(health.def).toContain("20000");

    await sql`insert into pvp_test.audit_logs (action, details) values ('probe_fail', '{}'::jsonb)`;
    const failPlan = await sql.unsafe(`
      explain select id from pvp_test.audit_logs
      where action ~* '(fail|error|critical)'
      order by id desc limit 1`);
    expect(failPlan.map((r: { "QUERY PLAN": string }) => r["QUERY PLAN"]).join("\n")).toMatch(
      /audit_logs_fail_id_idx/,
    );

    const authTables = await sql`
      select c.relname, c.relrowsecurity,
        (select count(*)::int from pg_policies p
          where p.schemaname = 'pvp_test' and p.tablename = c.relname) as policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'pvp_test'
        and c.relname in ('test_auth_users', 'test_auth_sessions')
      order by 1`;
    expect(authTables).toEqual([
      { relname: "test_auth_sessions", relrowsecurity: true, policies: 0 },
      { relname: "test_auth_users", relrowsecurity: true, policies: 0 },
    ]);
    const clientGrants = await sql`
      select grantee, table_name
      from information_schema.role_table_grants
      where table_schema = 'pvp_test'
        and table_name in ('test_auth_users', 'test_auth_sessions')
        and grantee in ('PUBLIC', 'anon', 'authenticated')`;
    expect(clientGrants).toEqual([]);

    const admin = randomUUID();
    await sql`select pvp_test.ensure_profile(${`a${admin.slice(0, 6)}`}, true)
      from (select set_config('test.uid', ${admin}, true)) c`;
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}, 'admin'::pvp_test.app_role)`;
    const session = await openAdminStepup(sql, admin);
    const claims = adminClaims(admin, session);
    const [live] = await sql.begin(async (tx) => {
      await tx`select set_config('test.uid', ${admin}, true), set_config('request.jwt.claims', ${claims}, true)`;
      return tx`select pvp_test.admin_ops_query('live', '{}'::jsonb) as r`;
    });
    expect(live.r.workers).toBeTruthy();
    expect(JSON.stringify(live.r)).not.toMatch(/private_key|signed_raw/);
  });
});
