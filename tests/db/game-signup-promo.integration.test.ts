/**
 * Game-page signup impressions. Isolated pvp_test schema only.
 * Requires TEST_DATABASE_URL and refuses the production database.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestSchemaToReal } from "./money";
import { promoTestIp } from "./promo-client-ip";
import { applyTestSchema } from "./schema";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

const CAMPAIGN = "game_signup_pvp1_v1";
const adminSessions = new Map<string, string>();

function hash(label: string): string {
  return createHash("sha256").update(label).digest("hex");
}

function adminClaims(uid: string | null): string | null {
  if (!uid) return null;
  const sessionId = adminSessions.get(uid);
  if (!sessionId) return null;
  return JSON.stringify({ role: "authenticated", sub: uid, session_id: sessionId });
}

async function user(name: string) {
  const id = randomUUID();
  const username = (name + id.replace(/-/g, "")).slice(0, 20);
  await sql`select pvp_test.ensure_profile(${username}, true)
    from (select set_config('test.uid', ${id}, true)) c`;
  return id;
}

async function admin() {
  const id = await user("adm");
  const sessionId = randomUUID();
  const deviceId = randomUUID();
  const tokenHash = randomBytes(32).toString("hex");
  await sql`insert into pvp_test.user_roles (user_id, role) values (${id}::uuid, 'admin')`;
  await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
    values (${deviceId}::uuid, ${id}::uuid, ${tokenHash}, clock_timestamp())`;
  await sql`insert into pvp_test.test_auth_sessions (id, user_id)
    values (${sessionId}::uuid, ${id}::uuid)`;
  await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
    values (${sessionId}::uuid, ${id}::uuid, ${deviceId}::uuid)`;
  adminSessions.set(id, sessionId);
  return id;
}

async function createPvp1(actor: string, cents = 100, max = 5) {
  const claims = adminClaims(actor) ?? "";
  const row = (
    await sql`select pvp_test.promo_admin_create('PVP1', ${cents}::bigint, ${max}, null) r
      from (select set_config('test.uid', ${actor}, true), set_config('request.jwt.claims', ${claims}, true)) c`
  )[0].r as { ok?: boolean };
  return row;
}

async function reserve(ipHash: string, game: string) {
  const row = (await sql`select pvp_test.reserve_game_signup_impression(${ipHash}, ${game}) r`)[0]
    .r as { show?: boolean };
  return row;
}

async function record(ipHash: string, event: string) {
  const row = (await sql`select pvp_test.record_game_signup_event(${ipHash}, ${event}) r`)[0].r as {
    ok?: boolean;
    recorded?: boolean;
  };
  return row;
}

async function impressions(ipHash: string) {
  return sql`select game from pvp_test.game_signup_impressions
    where campaign = ${CAMPAIGN} and ip_hash = ${ipHash}`;
}

async function events(ipHash: string, event: string) {
  const row = (
    await sql`select count(*)::int n from pvp_test.game_signup_events
      where campaign = ${CAMPAIGN} and ip_hash = ${ipHash} and event = ${event}`
  )[0];
  return Number(row.n);
}

d("game signup promo impressions (isolated schema)", () => {
  let actor = "";

  beforeAll(async () => {
    await applyTestSchema(sql);
    await migrateTestSchemaToReal(sql, { realPlay: true });
    await sql`select pvp_test._system_account('house_bankroll', 'USD', 'real')`;
    await sql`update pvp_test.wallet_accounts set balance = balance + 100000
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real'`;
    actor = await admin();
    const created = await createPvp1(actor);
    expect(created.ok ?? true).toBeTruthy();
  }, 180000);

  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it("records one impression for the first visitor and ignores a repeat", async () => {
    const ipHash = hash("first");
    expect(await reserve(ipHash, "roulette")).toEqual({ show: true });
    expect(await reserve(ipHash, "poker")).toEqual({ show: false });
    expect(await impressions(ipHash)).toEqual([{ game: "roulette" }]);
    expect(await events(ipHash, "promo_modal_eligible")).toBe(1);
    expect(await events(ipHash, "promo_modal_impression")).toBe(0);
  });

  it("lets only one of two concurrent reservations win", async () => {
    const ipHash = hash("concurrent");
    const [a, b] = await Promise.all([reserve(ipHash, "jackpot"), reserve(ipHash, "slott")]);
    const shown = [a, b].filter((row) => row.show === true);
    expect(shown).toHaveLength(1);
    expect(await impressions(ipHash)).toHaveLength(1);
    expect(await events(ipHash, "promo_modal_eligible")).toBe(1);
  });

  it("records the displayed impression once, then dismiss, without a second popup", async () => {
    const ipHash = hash("events");
    expect(await reserve(ipHash, "coinflip")).toEqual({ show: true });
    expect(await record(ipHash, "promo_modal_impression")).toMatchObject({
      ok: true,
      recorded: true,
    });
    expect(await record(ipHash, "promo_modal_impression")).toMatchObject({
      ok: true,
      recorded: false,
    });
    expect(await record(ipHash, "promo_modal_dismiss")).toMatchObject({ ok: true, recorded: true });
    expect(await record(ipHash, "promo_modal_eligible")).toEqual({ ok: false });
    expect(await events(ipHash, "promo_modal_impression")).toBe(1);
    expect(await reserve(ipHash, "coinflip")).toEqual({ show: false });
  });

  it("does not record an event for a hash that never reserved", async () => {
    expect(await record(hash("stranger"), "promo_modal_cta_click")).toEqual({ ok: false });
  });

  it("hides the offer when PVP1 is inactive, expired, or exhausted", async () => {
    const paused = hash("paused");
    await sql`update pvp_test.promo_codes set active = false where code = 'PVP1'`;
    expect(await reserve(paused, "poker")).toEqual({ show: false });
    expect(await impressions(paused)).toHaveLength(0);
    await sql`update pvp_test.promo_codes set active = true where code = 'PVP1'`;

    const expired = hash("expired");
    await sql`update pvp_test.promo_codes set expires_at = clock_timestamp() - interval '1 minute' where code = 'PVP1'`;
    expect(await reserve(expired, "poker")).toEqual({ show: false });
    await sql`update pvp_test.promo_codes set expires_at = null where code = 'PVP1'`;

    const fresh = hash("after-restore");
    expect(await reserve(fresh, "slott")).toEqual({ show: true });
  });

  it("rate limits a noisy hash without blocking a different visitor", async () => {
    await sql`update pvp_test.promo_codes set active = false where code = 'PVP1'`;
    const noisy = hash("noisy");
    for (let i = 0; i < 20; i += 1)
      expect(await reserve(noisy, "jackpot")).toEqual({ show: false });
    await sql`update pvp_test.promo_codes set active = true where code = 'PVP1'`;
    expect(await reserve(noisy, "jackpot")).toEqual({ show: false });
    expect(await impressions(noisy)).toHaveLength(0);
    expect(await reserve(hash("quiet"), "jackpot")).toEqual({ show: true });
  });

  it("replaces an impression older than the retention window", async () => {
    const ipHash = hash("stale");
    await sql`insert into pvp_test.game_signup_impressions (campaign, ip_hash, game, created_at)
      values (${CAMPAIGN}, ${ipHash}, 'poker', clock_timestamp() - interval '181 days')`;
    expect(await reserve(ipHash, "roulette")).toEqual({ show: true });
    const rows = await sql`select game, created_at > clock_timestamp() - interval '1 hour' as fresh
      from pvp_test.game_signup_impressions where ip_hash = ${ipHash}`;
    expect(rows).toEqual([{ game: "roulette", fresh: true }]);
  });

  it("keeps promo_claim, wagering, and account access independent of the popup", async () => {
    const def = (
      await sql`select pg_get_functiondef(p.oid) as def
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'pvp_test' and p.proname = 'promo_claim'
          and pg_get_function_identity_arguments(p.oid) = 'p_code text'`
    )[0].def as string;
    expect(def).toContain("PROMO_IP_ALREADY_REDEEMED");
    expect(def).toContain("promo_reward");
    expect(def).toContain("required_wager_cents");
    expect(def).not.toContain("game_signup");

    const body = (
      await sql`select pg_get_functiondef(p.oid) as def
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'pvp_test' and p.proname = 'reserve_game_signup_impression'`
    )[0].def as string;
    expect(body).toContain("reward_cents is distinct from 100");

    const shared = "2001:db8:aaaa:bbbb:cccc:dddd:eeee:1";
    const first = await user("one");
    const second = await user("two");
    expect(
      Number(
        (
          await sql`select count(*)::int n from pvp_test.profiles where id in (${first}::uuid, ${second}::uuid)`
        )[0].n,
      ),
    ).toBe(2);
    const ipHash = hash("players");
    expect(await reserve(ipHash, "poker")).toEqual({ show: true });
    expect(
      await sql`select count(*)::int n from pvp_test.promo_claims where user_id in (${first}::uuid, ${second}::uuid)`,
    ).toEqual([{ n: 0 }]);

    const claim = async (uid: string) =>
      (
        await sql`select pvp_test.promo_claim('PVP1') r
          from (select set_config('test.uid', ${uid}, true), set_config('test.client_ip', ${shared}, true)) c`
      )[0].r as {
        ok?: boolean;
        reason?: string;
        reward_cents?: number;
        required_wager_cents?: number;
      };

    const won = await claim(first);
    expect(won).toMatchObject({ ok: true, reward_cents: 100, required_wager_cents: 100 });
    const lost = await claim(second);
    expect(lost).toMatchObject({ ok: false, reason: "PROMO_IP_ALREADY_REDEEMED" });
    expect(await impressions(ipHash)).toHaveLength(1);

    await sql`update pvp_test.promo_codes set claim_count = max_claims where code = 'PVP1'`;
    expect(await reserve(hash("exhausted"), "roulette")).toEqual({ show: false });
  });

  it("does not expose the tables or functions to anon or authenticated", async () => {
    const tables = await sql`select
      has_table_privilege('anon', 'pvp_test.game_signup_impressions', 'select') as anon_read,
      has_table_privilege('authenticated', 'pvp_test.game_signup_events', 'insert') as user_write,
      has_function_privilege('anon', 'pvp_test.reserve_game_signup_impression(text,text)', 'execute') as anon_fn,
      has_function_privilege('authenticated', 'pvp_test.record_game_signup_event(text,text)', 'execute') as user_fn`;
    expect(tables[0]).toEqual({
      anon_read: false,
      user_write: false,
      anon_fn: false,
      user_fn: false,
    });
  });

  it("rejects a hash that is not 64 hex characters", async () => {
    expect(await reserve("203.0.113.9", "poker")).toEqual({ show: false });
    expect(await reserve(promoTestIp(randomUUID()), "poker")).toEqual({ show: false });
  });
});
