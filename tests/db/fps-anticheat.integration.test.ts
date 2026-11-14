import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyTestSchema } from "./schema";
import { testDatabaseUrl } from "./test-url";

/**
 * FPS anti-cheat enforcement (20261114030000): evidence in, automatic decisions out, the join
 * check, expiry, appeals, the admin console, the rollout modes and the safety switch.
 */
const sql = postgres(testDatabaseUrl(), {
  max: 2,
  prepare: false,
  onnotice: () => {},
  idle_timeout: 5,
});
const adminSessions = new Map<string, string>();

async function user(name = "ac") {
  const id = randomUUID();
  const username = (name + id.replace(/-/g, "")).slice(0, 20);
  await sql`insert into pvp_test.test_auth_users(id) values (${id}) on conflict do nothing`;
  await sql`select pvp_test.ensure_profile(${username}, true)
    from (select set_config('test.uid', ${id}, true)) c`;
  return id;
}
async function admin() {
  const id = await user("adm");
  const sessionId = randomUUID(),
    deviceId = randomUUID();
  await sql`insert into pvp_test.user_roles (user_id, role) values (${id}::uuid, 'admin')`;
  await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
    values (${deviceId}::uuid, ${id}::uuid, ${randomBytes(32).toString("hex")}, clock_timestamp())`;
  await sql`insert into pvp_test.test_auth_sessions (id, user_id) values (${sessionId}::uuid, ${id}::uuid)`;
  await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
    values (${sessionId}::uuid, ${id}::uuid, ${deviceId}::uuid)`;
  adminSessions.set(id, sessionId);
  return id;
}
/** Run `fn` as a browser user (authenticated, with that user's claims). */
function asUser<T>(uid: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  const session = adminSessions.get(uid);
  const claims = JSON.stringify({
    role: "authenticated",
    sub: uid,
    ...(session ? { session_id: session } : {}),
  });
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid}, true), set_config('request.jwt.claims', ${claims}, true)`;
    await tx.unsafe("set local role authenticated");
    return fn(tx);
  }) as Promise<T>;
}
function asService<T>(fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx.unsafe("set local role service_role");
    return fn(tx);
  }) as Promise<T>;
}
type Row = {
  user: string;
  match: string;
  mode: "duel" | "bomb" | "br";
  aim?: number;
  tracking?: number;
  canary?: { trials: number; decisive: number; won: number };
  protocol?: number;
};
const submit = (rows: Row[]) =>
  asService(
    async (tx) => (await tx`select pvp_test.fps_ac_submit(${sql.json(rows)}::jsonb) r`)[0]!.r,
  );
const account = async (u: string) =>
  (await sql`select * from pvp_test.fps_ac_accounts where user_id = ${u}`)[0];
const restrictions = (u: string) =>
  sql`select * from pvp_test.fps_ac_restrictions where user_id = ${u} order by created_at`;
async function check(u: string, scope: "competitive" | "practice") {
  const session = randomUUID();
  await sql`insert into pvp_test.test_auth_sessions (id, user_id) values (${session}, ${u})`;
  return asService(
    async (tx) =>
      (
        await tx`select pvp_test.fps_check_sessions_v2(${sql.json([{ session_id: session, user_id: u }])}::jsonb, ${scope}) r`
      )[0]!.r[0] as { active: boolean; restricted: string | null; until: string | null },
  );
}
const setMode = (mode: string) =>
  sql`update pvp_test.fps_ac_config set mode = ${mode}, safety_tripped_at = null`;
let n = 0;
const match = () => `m-${Date.now()}-${n++}`;

describe("FPS anti-cheat enforcement", () => {
  beforeAll(() => applyTestSchema(sql), 300_000);
  afterAll(() => sql.end());
  beforeEach(async () => {
    await setMode("shadow");
    // (Earlier tests' decisions must not count towards the safety switch.)
    await sql`update pvp_test.fps_ac_config set thresholds = thresholds
      || '{"safety_per_hour":1000,"safety_per_day":1000,"safety_flags_per_hour":1000}'::jsonb`;
  });

  it("keeps every table and service function away from browsers", async () => {
    for (const role of ["anon", "authenticated"]) {
      const [p] = await sql`select
        has_function_privilege(${role}, 'pvp_test.fps_ac_submit(jsonb)', 'execute') submit,
        has_function_privilege(${role}, 'pvp_test.fps_check_sessions_v2(jsonb,text)', 'execute') check,
        has_function_privilege(${role}, 'pvp_test._fps_ac_evaluate(uuid)', 'execute') evaluate,
        has_table_privilege(${role}, 'pvp_test.fps_ac_restrictions', 'select') restrictions,
        has_table_privilege(${role}, 'pvp_test.fps_ac_evidence', 'insert') evidence,
        has_table_privilege(${role}, 'pvp_test.fps_ac_config', 'update') config`;
      expect(p).toEqual({
        submit: false,
        check: false,
        evaluate: false,
        restrictions: false,
        evidence: false,
        config: false,
      });
    }
    // A player is not an admin.
    const u = await user();
    await expect(
      asUser(u, (tx) => tx`select pvp_test.fps_ac_admin_overview('{}'::jsonb)`),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      asUser(
        u,
        (tx) =>
          tx`select pvp_test.fps_ac_admin_act('clear', ${u}::uuid, 'myself', null, 'competitive')`,
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    // The audit trail is append-only, even for the service.
    await submit([{ user: u, match: match(), mode: "br", aim: 1 }]);
    await expect(
      sql`update pvp_test.fps_ac_events set level = 0 where user_id = ${u}`,
    ).rejects.toThrow(/APPEND_ONLY/);
    await expect(sql`delete from pvp_test.fps_ac_events where user_id = ${u}`).rejects.toThrow(
      /APPEND_ONLY/,
    );
  });

  it("never restricts on aim statistics alone, however many matches", async () => {
    await setMode("full");
    const u = await user();
    for (let i = 0; i < 40; i++) await submit([{ user: u, match: match(), mode: "duel", aim: 2 }]);
    expect((await account(u)).level).toBe(2);
    expect(await restrictions(u)).toHaveLength(0);
    expect((await check(u, "competitive")).active).toBe(true);
  });

  it("is idempotent per match: a replayed submission counts nothing twice", async () => {
    const u = await user(),
      m = match();
    for (let i = 0; i < 5; i++)
      await submit([
        { user: u, match: m, mode: "bomb", aim: 2, canary: { trials: 9, decisive: 5, won: 5 } },
      ]);
    const a = await account(u);
    expect(a.matches).toBe(1);
    expect(a.aim_strong_matches).toBe(1);
    expect(a.canary_decisive).toBe(5);
    // Nonsense is clamped (won ≤ decisive ≤ trials).
    const v = await user();
    await submit([
      { user: v, match: match(), mode: "br", aim: 9, canary: { trials: 3, decisive: 50, won: 80 } },
    ]);
    const b = await account(v);
    expect([b.aim_strong_matches, b.canary_trials, b.canary_decisive, b.canary_won]).toEqual([
      1, 3, 3, 3,
    ]);
  });

  it("shadow mode records what it would do and enforces nothing", async () => {
    const u = await user();
    // Aim and tracking strong, in several matches: two independent statistical families.
    for (let i = 0; i < 3; i++)
      await submit([{ user: u, match: match(), mode: "br", aim: 2, tracking: 2 }]);
    expect((await account(u)).level).toBe(3);
    const r = await restrictions(u);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: "competitive", enforced: false, source: "auto" });
    expect((await check(u, "competitive")).active).toBe(true);
    const events = await sql`select kind from pvp_test.fps_ac_events where user_id = ${u}`;
    expect(events.map((e) => e.kind)).toContain("would_restrict");
  });

  it("validated mode: a canary record restricts competitive play (not practice), with notice, appeal and expiry", async () => {
    await setMode("validated");
    const u = await user();
    // 40 decisive canary trials over three matches, 38 won: e ≈ 10⁸ (level 3).
    await submit([
      { user: u, match: match(), mode: "br", canary: { trials: 20, decisive: 14, won: 13 } },
    ]);
    await submit([
      { user: u, match: match(), mode: "br", canary: { trials: 20, decisive: 13, won: 13 } },
    ]);
    await submit([
      { user: u, match: match(), mode: "br", canary: { trials: 20, decisive: 13, won: 12 } },
    ]);
    const a = await account(u);
    expect(a.level).toBe(3);
    const [r] = await restrictions(u);
    expect(r).toMatchObject({ kind: "competitive", enforced: true, reason: "fair_play" });
    const hours = (new Date(r!.ends_at).getTime() - new Date(r!.starts_at).getTime()) / 3.6e6;
    expect(hours).toBeCloseTo(24, 0);
    expect(await check(u, "competitive")).toMatchObject({
      active: false,
      restricted: "competitive",
    });
    expect((await check(u, "practice")).active).toBe(true);
    // The player's notice: temporary, until when, a general reason; nothing about thresholds.
    const status = await asUser(
      u,
      async (tx) => (await tx`select pvp_test.fps_ac_my_status() r`)[0]!.r,
    );
    expect(status).toMatchObject({
      restricted: true,
      kind: "competitive",
      permanent: false,
      can_appeal: true,
    });
    expect(JSON.stringify(status)).not.toMatch(/log_e|canary|threshold|families|level|decisive/i);
    // One appeal; a second is refused; someone else cannot appeal it.
    await asUser(
      u,
      (tx) =>
        tx`select pvp_test.fps_ac_appeal(${r!.id}::uuid, 'I play with a high sensitivity mouse.')`,
    );
    await expect(
      asUser(
        u,
        (tx) => tx`select pvp_test.fps_ac_appeal(${r!.id}::uuid, 'Second try at an appeal here.')`,
      ),
    ).rejects.toThrow(/APPEAL_EXISTS/);
    const other = await user();
    await expect(
      asUser(
        other,
        (tx) => tx`select pvp_test.fps_ac_appeal(${r!.id}::uuid, 'Not my restriction at all.')`,
      ),
    ).rejects.toThrow(/NOT_FOUND/);
    // Expiry is the clock: once it ends, it no longer counts (no job, no restart needed).
    await sql`update pvp_test.fps_ac_restrictions set starts_at = now() - interval '2 days',
      ends_at = now() - interval '1 second' where id = ${r!.id}`;
    expect((await check(u, "competitive")).active).toBe(true);
    const after = await asUser(
      u,
      async (tx) => (await tx`select pvp_test.fps_ac_my_status() r`)[0]!.r,
    );
    expect(after).toEqual({ restricted: false });
    // Tampering: at level 3 a competitive restriction (enforced), at level 4 a ban, recorded
    // but not enforced in validated mode.
    const t = await user();
    for (let i = 0; i < 5; i++)
      await submit([{ user: t, match: match(), mode: "duel", protocol: 6 }]);
    const [first, ban] = await restrictions(t);
    expect(first).toMatchObject({ kind: "competitive", enforced: true, reason: "tampering" });
    expect(ban).toMatchObject({ kind: "ban", enforced: false });
  });

  it("full mode bans on server-verified tampering, everywhere, and escalates only on new evidence", async () => {
    await setMode("full");
    const u = await user();
    for (let i = 0; i < 5; i++)
      await submit([{ user: u, match: match(), mode: "duel", protocol: 6 }]);
    // Level 3 at the third tampered match (24 h competitive), level 4 at the fifth (a ban).
    const [first, ban] = await restrictions(u);
    expect(first).toMatchObject({ kind: "competitive", enforced: true });
    expect(ban).toMatchObject({ kind: "ban", enforced: true, reason: "tampering" });
    const days = (new Date(ban!.ends_at).getTime() - new Date(ban!.starts_at).getTime()) / 8.64e7;
    expect(days).toBeCloseTo(7, 0);
    expect((await check(u, "practice")).active).toBe(false);
    expect((await check(u, "competitive")).restricted).toBe("ban");
    // Evaluating again with nothing new changes nothing.
    await asService((tx) => tx`select pvp_test._fps_ac_evaluate(${u}::uuid)`);
    expect(await restrictions(u)).toHaveLength(2);
    // After it ends, two more tampered matches: the next is 30 days.
    await sql`update pvp_test.fps_ac_restrictions set starts_at = now() - interval '8 days',
      ends_at = now() - interval '1 hour' where id = ${ban!.id}`;
    for (let i = 0; i < 2; i++)
      await submit([{ user: u, match: match(), mode: "bomb", protocol: 3 }]);
    const list = await restrictions(u);
    expect(list).toHaveLength(3);
    const second = list[2]!;
    expect(second.kind).toBe("ban");
    expect(
      (new Date(second.ends_at).getTime() - new Date(second.starts_at).getTime()) / 8.64e7,
    ).toBeCloseTo(30, 0);
    // Never permanent without a very strong record after earlier bans.
    expect(list.every((r) => r.ends_at !== null)).toBe(true);
  });

  it("trips the safety switch on an unusual wave and stops enforcing", async () => {
    await setMode("full");
    await sql`update pvp_test.fps_ac_config set thresholds = thresholds || '{"safety_per_hour": 2}'::jsonb`;
    // (The hour's count includes decisions earlier tests made in full mode.)
    const before = Number(
      (
        await sql`select count(*) n from pvp_test.fps_ac_restrictions where source = 'auto' and enforced
        and created_at > now() - interval '1 hour'`
      )[0]!.n,
    );
    await sql`update pvp_test.fps_ac_config set thresholds = thresholds || ${sql.json({ safety_per_hour: before + 3 })}::jsonb`;
    const users = [await user(), await user(), await user()];
    for (const u of users)
      for (let i = 0; i < 5; i++)
        await submit([{ user: u, match: match(), mode: "duel", protocol: 6 }]);
    // Each tampering account gets two decisions (level 3, then 4): the fourth enforced one
    // this hour trips the switch.
    const enforced = await Promise.all(
      users.map(async (u) => (await restrictions(u)).map((r) => r.enforced)),
    );
    expect(enforced).toEqual([
      [true, true],
      [true, false],
      [false, false],
    ]);
    const [cfg] = await sql`select safety_tripped_at, safety_reason from pvp_test.fps_ac_config`;
    expect(cfg!.safety_tripped_at).not.toBeNull();
    expect(cfg!.safety_reason).toMatch(/per hour/);
    // While tripped, nothing new is enforced.
    const v = await user();
    for (let i = 0; i < 5; i++)
      await submit([{ user: v, match: match(), mode: "duel", protocol: 6 }]);
    expect((await restrictions(v))[0]!.enforced).toBe(false);
  });

  it("checks a full 100-player BR room in one batch and rejects batches beyond room capacity", async () => {
    const sessions = Array.from({ length: 100 }, () => ({
      user_id: randomUUID(),
      session_id: randomUUID(),
    }));
    const payload = sql.json(sessions);
    await sql`insert into pvp_test.test_auth_users(id)
      select x.user_id from jsonb_to_recordset(${payload}::jsonb) as x(user_id uuid)`;
    await sql`insert into pvp_test.test_auth_sessions(id, user_id)
      select x.session_id, x.user_id from jsonb_to_recordset(${payload}::jsonb) as x(session_id uuid, user_id uuid)`;
    const result = await asService(
      async (tx) =>
        (await tx`select pvp_test.fps_check_sessions_v2(${payload}::jsonb, 'competitive') r`)[0]!.r,
    );
    expect(result).toHaveLength(100);
    expect(result.every((r: { active: boolean }) => r.active)).toBe(true);
    const oversized = [...sessions, { user_id: randomUUID(), session_id: randomUUID() }];
    await expect(
      asService(
        (tx) =>
          tx`select pvp_test.fps_check_sessions_v2(${sql.json(oversized)}::jsonb, 'competitive')`,
      ),
    ).rejects.toThrow(/INVALID_SESSION_BATCH/);
  });

  it("pauses existing automatic restrictions on safety or shadow, but preserves moderator bans", async () => {
    await setMode("full");
    const u = await user("rollback");
    for (let i = 0; i < 5; i++)
      await submit([{ user: u, match: match(), mode: "duel", protocol: 6 }]);
    expect((await check(u, "competitive")).restricted).toBe("ban");
    await sql`update pvp_test.fps_ac_config set safety_tripped_at = now(), safety_reason = 'test rollback'`;
    expect((await check(u, "competitive")).active).toBe(true);
    expect((await check(u, "practice")).active).toBe(true);
    await setMode("shadow");
    expect((await check(u, "competitive")).active).toBe(true);
    const notice = await asUser(
      u,
      async (tx) => (await tx`select pvp_test.fps_ac_my_status() r`)[0]!.r,
    );
    expect(notice.restricted).toBe(false);
    const adm = await admin();
    const paused = await asUser(
      adm,
      async (tx) =>
        (await tx`select pvp_test.fps_ac_admin_overview(${sql.json({ q: u })}::jsonb) r`)[0]!.r,
    );
    expect(paused.restrictions.every((r: { status: string }) => r.status === "paused")).toBe(true);
    // Returning only to validated must not reactivate an earlier full-mode automatic ban.
    await setMode("validated");
    expect((await check(u, "practice")).active).toBe(true);
    expect((await check(u, "competitive")).restricted).toBe("competitive");
    await setMode("full");
    expect((await check(u, "practice")).restricted).toBe("ban");
    await setMode("shadow");
    const manualUser = await user("moderated");
    await asUser(
      adm,
      (tx) =>
        tx`select pvp_test.fps_ac_admin_act('restrict', ${manualUser}::uuid, 'moderator ban', 7, 'ban')`,
    );
    expect((await check(manualUser, "competitive")).restricted).toBe("ban");
    expect((await check(manualUser, "practice")).restricted).toBe("ban");
    const [permissions] = await sql`select
      has_function_privilege('anon', 'pvp_test_fps_private.ac_should_enforce(text,text)', 'execute') anon,
      has_function_privilege('authenticated', 'pvp_test_fps_private.ac_should_enforce(text,text)', 'execute') authenticated`;
    expect(permissions).toEqual({ anon: false, authenticated: false });
  });

  it("gives admins the console: filters, the player's file, and audited decisions", async () => {
    await setMode("full");
    const adm = await admin();
    const u = await user("cheat");
    for (let i = 0; i < 5; i++)
      await submit([{ user: u, match: match(), mode: "br", protocol: 4 }]);
    const view = await asUser(
      adm,
      async (tx) =>
        (
          await tx`select pvp_test.fps_ac_admin_overview(${sql.json({ q: u, min_level: 1 })}::jsonb) r`
        )[0]!.r,
    );
    expect(view.accounts.map((a: { user_id: string }) => a.user_id)).toEqual([u]);
    expect(view.restrictions[0]).toMatchObject({ user_id: u, kind: "ban", status: "active" });
    const byMode = await asUser(
      adm,
      async (tx) =>
        (
          await tx`select pvp_test.fps_ac_admin_overview(${sql.json({ q: u, mode: "duel" })}::jsonb) r`
        )[0]!.r,
    );
    expect(byMode.accounts).toHaveLength(0);
    const file = await asUser(
      adm,
      async (tx) => (await tx`select pvp_test.fps_ac_admin_player(${u}::uuid) r`)[0]!.r,
    );
    expect(file.evidence).toHaveLength(5);
    const id = view.restrictions[0].id as string;
    // A note is required; then unban.
    await expect(
      asUser(
        adm,
        (tx) =>
          tx`select pvp_test.fps_ac_admin_act('revoke', ${id}::uuid, '', null, 'competitive')`,
      ),
    ).rejects.toThrow(/NOTE_REQUIRED/);
    // Unban (the ban first: practice is open again; then the level-3 restriction too).
    await asUser(
      adm,
      (tx) =>
        tx`select pvp_test.fps_ac_admin_act('revoke', ${id}::uuid, 'false positive', null, 'competitive')`,
    );
    expect((await check(u, "practice")).active).toBe(true);
    expect((await check(u, "competitive")).restricted).toBe("competitive");
    const other = view.restrictions[1].id as string;
    await asUser(
      adm,
      (tx) =>
        tx`select pvp_test.fps_ac_admin_act('revoke', ${other}::uuid, 'false positive', null, 'competitive')`,
    );
    expect((await check(u, "competitive")).active).toBe(true);
    // Extend (re-applies), manual restriction, clear, appeal decisions.
    await asUser(
      adm,
      (tx) =>
        tx`select pvp_test.fps_ac_admin_act('restrict', ${u}::uuid, 'manual review', 30, 'competitive')`,
    );
    expect((await check(u, "competitive")).restricted).toBe("competitive");
    const [manual] =
      await sql`select id from pvp_test.fps_ac_restrictions where user_id = ${u} and source = 'admin'`;
    await asUser(
      adm,
      (tx) =>
        tx`select pvp_test.fps_ac_admin_act('extend', ${manual!.id}::uuid, 'longer', 10, 'competitive')`,
    );
    await asUser(
      u,
      (tx) =>
        tx`select pvp_test.fps_ac_appeal(${manual!.id}::uuid, 'Please look at this again, thanks.')`,
    );
    const [ap] =
      await sql`select id from pvp_test.fps_ac_appeals where restriction_id = ${manual!.id}`;
    await asUser(
      adm,
      (tx) =>
        tx`select pvp_test.fps_ac_admin_act('overturn', ${ap!.id}::uuid, 'agreed', null, 'competitive')`,
    );
    expect((await check(u, "competitive")).active).toBe(true);
    await asUser(
      adm,
      (tx) =>
        tx`select pvp_test.fps_ac_admin_act('clear', ${u}::uuid, 'reviewed clean', null, 'competitive')`,
    );
    expect((await account(u)).level).toBe(0);
    await asUser(
      adm,
      (tx) => tx`select pvp_test.fps_ac_admin_config('shadow', true, 'calibrating')`,
    );
    const audit = await sql`select kind, actor, detail->>'action' action from pvp_test.fps_ac_events
      where actor = ${adm} order by id`;
    expect(audit.map((e) => e.action ?? e.kind)).toEqual([
      "revoke",
      "revoke",
      "restrict",
      "extend",
      "overturn",
      "clear",
      "config",
    ]);
  });
});
