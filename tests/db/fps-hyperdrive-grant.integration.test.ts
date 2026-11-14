import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyTestSchema } from "./schema";
import { testDatabaseUrl } from "./test-url";

/**
 * The FPS rooms read sessions through Hyperdrive as `pvpstrike_hyperdrive` (provisioned outside
 * migrations, docs/FPS-HYPERDRIVE-2026-11-01.md). 2026-11-14: check_sessions_v2 had no grant
 * for it, so with FPS_AC_ENFORCE=1 every admission failed and every loading screen hung.
 * Migration 20261114220000 grants it; here the check runs as that role, and restrictions and
 * bans still refuse admission through it.
 */
const sql = postgres(testDatabaseUrl(), {
  max: 2,
  prepare: false,
  onnotice: () => {},
  idle_timeout: 5,
});
const ROLE = "pvpstrike_hyperdrive";

async function user() {
  const id = randomUUID();
  await sql`insert into pvp_test.test_auth_users(id) values (${id}) on conflict do nothing`;
  await sql`select pvp_test.ensure_profile(${("hd" + id.replace(/-/g, "")).slice(0, 20)}, true)
    from (select set_config('test.uid', ${id}, true)) c`;
  const session = randomUUID();
  await sql`insert into pvp_test.test_auth_sessions (id, user_id) values (${session}, ${id})`;
  return { id, session };
}
/** check_sessions_v2 exactly as the rooms call it, as the Hyperdrive login. */
async function checkAsHyperdrive(u: { id: string; session: string }, scope: string) {
  return sql.begin(async (tx) => {
    await tx.unsafe(`set local role ${ROLE}`);
    const [row] =
      await tx`select pvp_test_fps_private.check_sessions_v2(${sql.json([{ session_id: u.session, user_id: u.id }])}::jsonb, ${scope}) r`;
    return (row!.r as Array<{ active: boolean; restricted?: string | null }>)[0]!;
  });
}
const restrict = (userId: string, kind: "competitive" | "ban") =>
  sql`insert into pvp_test.fps_ac_restrictions (user_id, kind, level, enforced, source, reason)
      values (${userId}, ${kind}, ${kind === "ban" ? 4 : 2}, true, 'admin', 'admin')`;

describe("Hyperdrive login and the anti-cheat session check", () => {
  beforeAll(async () => {
    // As production: the login exists before the migrations run, with no inherited roles.
    await sql.unsafe(`do $$ begin
      if not exists (select 1 from pg_roles where rolname = '${ROLE}') then
        create role ${ROLE} nologin noinherit;
      end if; end $$;`);
    await applyTestSchema(sql);
    // Its schema USAGE is provisioned with the login (outside migrations).
    await sql.unsafe(`grant usage on schema pvp_test_fps_private to ${ROLE}`);
  }, 300_000);
  afterAll(() => sql.end());

  it("may execute check_sessions_v2; browsers still may not", async () => {
    const [p] = await sql`select
      has_function_privilege(${ROLE}, 'pvp_test_fps_private.check_sessions_v2(jsonb,text)', 'execute') hyper,
      has_function_privilege('anon', 'pvp_test_fps_private.check_sessions_v2(jsonb,text)', 'execute') anon,
      has_function_privilege('authenticated', 'pvp_test_fps_private.check_sessions_v2(jsonb,text)', 'execute') auth`;
    expect(p).toEqual({ hyper: true, anon: false, auth: false });
  });

  it("admits a clean live session in both scopes", async () => {
    const u = await user();
    expect((await checkAsHyperdrive(u, "competitive")).active).toBe(true);
    expect((await checkAsHyperdrive(u, "practice")).active).toBe(true);
  });

  it("refuses a competitive restriction in matches and a ban everywhere", async () => {
    const competitive = await user();
    await restrict(competitive.id, "competitive");
    expect(await checkAsHyperdrive(competitive, "competitive")).toMatchObject({
      active: false,
      restricted: "competitive",
    });
    // Practice stays open under a competitive restriction.
    expect((await checkAsHyperdrive(competitive, "practice")).active).toBe(true);
    const banned = await user();
    await restrict(banned.id, "ban");
    for (const scope of ["competitive", "practice"])
      expect(await checkAsHyperdrive(banned, scope)).toMatchObject({
        active: false,
        restricted: "ban",
      });
  });
});
