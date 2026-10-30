import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { applyTestSchema } from "./schema";
import { testDatabaseUrl } from "./test-url";
const sql = postgres(testDatabaseUrl(), {
  max: 2,
  prepare: false,
  onnotice: () => {},
  idle_timeout: 5,
});
describe("FPS service-only authoritative Auth session status", () => {
  beforeAll(() => applyTestSchema(sql), 120000);
  afterAll(() => sql.end());
  it("denies both browser roles at the wrapper and private privilege boundary", async () => {
    for (const role of ["anon", "authenticated"]) {
      const [p] =
        await sql`select has_function_privilege(${role},'pvp_test.fps_check_sessions(jsonb)','execute') wrapper,
          has_schema_privilege(${role},'pvp_test_fps_private','usage') private_schema,
          has_function_privilege(${role},'pvp_test_fps_private.check_sessions(jsonb)','execute') helper`;
      expect(p).toEqual({ wrapper: false, private_schema: false, helper: false });
      await expect(
        sql.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          await tx`select pvp_test.fps_check_sessions('[]')`;
        }),
      ).rejects.toMatchObject({ code: "42501" });
    }
  });
  it("checks ownership, expiration, bans and deletion on every service call", async () => {
    const user = randomUUID(),
      session = randomUUID(),
      other = randomUUID();
    await sql`insert into pvp_test.test_auth_users(id) values(${user}),(${other})`;
    await sql`insert into pvp_test.test_auth_sessions(id,user_id)values(${session},${user})`;
    const check = () =>
      sql.begin(async (tx) => {
        await tx.unsafe("set local role service_role");
        return (
          await tx`select pvp_test.fps_check_sessions(${sql.json([
            { session_id: session, user_id: user },
            { session_id: session, user_id: other },
          ])}::jsonb) r`
        )[0].r;
      });
    expect(await check()).toEqual([
      { sessionId: session, userId: user, active: true },
      { sessionId: session, userId: other, active: false },
    ]);
    await sql`update pvp_test.test_auth_sessions set not_after=clock_timestamp()-interval '1 second' where id=${session}`;
    expect((await check())[0].active).toBe(false);
    await sql`update pvp_test.test_auth_sessions set not_after=null where id=${session}`;
    await sql`update pvp_test.test_auth_users set banned_until=clock_timestamp()+interval '1 day' where id=${user}`;
    expect((await check())[0].active).toBe(false);
    await sql`update pvp_test.test_auth_users set banned_until=null where id=${user}`;
    expect((await check())[0].active).toBe(true);
    await sql`delete from pvp_test.test_auth_sessions where id=${session}`;
    expect((await check())[0].active).toBe(false);
  });
  it("rejects malformed/oversized batches instead of returning success", async () => {
    await expect(sql`select pvp_test.fps_check_sessions('{}')`).rejects.toThrow(
      "INVALID_SESSION_BATCH",
    );
    const rows = Array.from({ length: 19 }, () => ({
      session_id: randomUUID(),
      user_id: randomUUID(),
    }));
    await expect(sql`select pvp_test.fps_check_sessions(${sql.json(rows)}::jsonb)`).rejects.toThrow(
      "INVALID_SESSION_BATCH",
    );
    await expect(
      sql`select pvp_test.fps_check_sessions(${sql.json(JSON.stringify(rows))}::jsonb)`,
    ).rejects.toThrow("INVALID_SESSION_BATCH");
  });
});
