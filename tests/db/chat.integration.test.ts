/** Chat integration suite against the isolated `pvp_test` schema. Requires SUPABASE_DB_URL. */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";

const url = process.env.SUPABASE_DB_URL?.replace(":6543/", ":5432/");
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 8, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);

let n = 0;
async function newUser() {
  const id = randomUUID();
  const name = `cht${Date.now().toString(36)}${n++}`.slice(0, 20);
  await sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${id}, true)`;
    await tx`select pvp_test.ensure_profile(${name}, true)`;
  });
  return id;
}
type R = { ok: boolean; code?: string; id?: string };
const send = async (u: string, text: string, room = "jackpot", sev = "LOW", reason = "ok") =>
  (await sql`select pvp_test.chat_send(${u}::uuid, ${room}, ${text}, ${sev}, ${reason}) r`)[0]
    .r as R;
/** What a signed-in browser reads: the RLS read policy is exactly `status = 'visible'` (asserted below). */
async function readAs(_u: string, room: string) {
  return sql`select id, message, status from pvp_test.game_chat_messages where game_type = ${room} and status = 'visible'`;
}

d("game chat (isolated schema)", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
  }, 120_000);
  afterAll(async () => {
    await sql.end();
  });

  it("saves a visible message even though broadcasting is unavailable in the test schema", async () => {
    const u = await newUser();
    const r = await send(u, "gg wp");
    expect(r.ok).toBe(true);
    const [row] = await sql`select * from pvp_test.game_chat_messages where id = ${r.id!}`;
    expect(row).toMatchObject({
      status: "visible",
      user_id: u,
      game_type: "jackpot",
      message: "gg wp",
      moderation_provider: "rules",
    });
  });

  it("validates room, length and profile server-side", async () => {
    const u = await newUser();
    expect((await send(u, "hi", "poker")).code).toBe("CHAT_INVALID");
    expect((await send(u, "x".repeat(501))).code).toBe("CHAT_INVALID");
    expect((await send(u, "")).code).toBe("CHAT_INVALID");
    expect((await send(u, "hi", "jackpot", "BOGUS")).code).toBe("CHAT_INVALID");
    expect((await send(randomUUID(), "hi")).code).toBe("CHAT_INVALID");
  });

  it("HIGH is stored hidden and audited as BLOCKED; MEDIUM hidden as HIDDEN", async () => {
    const u = await newUser();
    expect((await send(u, "bad one", "jackpot", "HIGH", "abuse")).code).toBe("CHAT_BLOCKED");
    expect((await send(u, "link one", "jackpot", "MEDIUM", "link")).code).toBe("CHAT_BLOCKED");
    const rows = await sql`select status from pvp_test.game_chat_messages where user_id = ${u}`;
    expect(rows.every((r) => r.status === "hidden")).toBe(true);
    const ev =
      await sql`select action from pvp_test.game_chat_moderation_events where user_id = ${u} order by id`;
    expect(ev.map((e) => e.action)).toEqual(["BLOCKED", "HIDDEN"]);
  });

  it("signed-in readers see only visible messages", async () => {
    const u = await newUser();
    const v = await send(u, "visible msg");
    await send(u, "hidden msg", "jackpot", "HIGH", "abuse");
    const rows = await readAs(u, "jackpot");
    expect(rows.some((r) => r.id === v.id)).toBe(true);
    expect(rows.every((r) => r.status === "visible")).toBe(true);
    expect(rows.some((r) => r.message === "hidden msg")).toBe(false);
  });

  it("25 simultaneous sends from one user: exactly 5 succeed", async () => {
    const u = await newUser();
    const rs = await Promise.all(Array.from({ length: 25 }, (_, i) => send(u, `msg ${i}`)));
    expect(rs.filter((r) => r.ok)).toHaveLength(5);
    expect(rs.filter((r) => r.code === "CHAT_RATE_LIMITED")).toHaveLength(20);
    const [{ c }] =
      await sql`select count(*)::int c from pvp_test.game_chat_moderation_events where user_id = ${u} and action = 'RATE_LIMITED'`;
    expect(c).toBe(20);
  });

  it("minute and hour windows are enforced", async () => {
    const u = await newUser();
    await sql`insert into pvp_test.game_chat_messages (game_type, user_id, message, created_at)
              select 'jackpot', ${u}, 'old ' || g, now() - interval '30 seconds' from generate_series(1, 20) g`;
    expect((await send(u, "one more")).code).toBe("CHAT_RATE_LIMITED");
    const u2 = await newUser();
    await sql`insert into pvp_test.game_chat_messages (game_type, user_id, message, created_at)
              select 'jackpot', ${u2}, 'old ' || g, now() - interval '30 minutes' from generate_series(1, 100) g`;
    expect((await send(u2, "one more")).code).toBe("CHAT_RATE_LIMITED");
  });

  it("identical messages within 30s are throttled (case-insensitive), across parallel duplicates", async () => {
    const u = await newUser();
    const rs = await Promise.all([send(u, "gg"), send(u, "gg"), send(u, "GG")]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    const [{ c }] =
      await sql`select count(*)::int c from pvp_test.game_chat_moderation_events where user_id = ${u} and action = 'SPAM_DETECTED'`;
    expect(c).toBe(2);
  });

  it("mute and ban are enforced server-side and audited", async () => {
    const u = await newUser();
    const mod = await newUser();
    await sql`select pvp_test.chat_set_restriction(${u}::uuid, now() + interval '10 minutes', false, ${mod}::uuid, 'spam')`;
    expect((await send(u, "hello")).code).toBe("CHAT_MUTED");
    await sql`select pvp_test.chat_set_restriction(${u}::uuid, null, false, ${mod}::uuid, 'ok')`;
    expect((await send(u, "hello")).ok).toBe(true);
    await sql`select pvp_test.chat_set_restriction(${u}::uuid, null, true, ${mod}::uuid, 'abuse')`;
    expect((await send(u, "hello again")).code).toBe("CHAT_MUTED");
    const ev =
      await sql`select action from pvp_test.game_chat_moderation_events where user_id = ${u} and moderator_id = ${mod} order by id`;
    expect(ev.map((e) => e.action)).toEqual(["MUTED", "UNMUTED", "BANNED"]);
  });

  it("moderator hide/restore/delete changes visibility; simultaneous moderation is consistent", async () => {
    const u = await newUser();
    const mod = await newUser();
    const r = await send(u, "to moderate");
    const res = await Promise.all(
      Array.from(
        { length: 6 },
        () =>
          sql`select pvp_test.chat_set_status(${r.id!}::uuid, 'hidden', ${mod}::uuid, 'review') r`,
      ),
    );
    expect(res.filter((x) => x[0].r.ok && !x[0].r.unchanged)).toHaveLength(1);
    expect((await readAs(u, "jackpot")).some((m) => m.id === r.id)).toBe(false);
    await sql`select pvp_test.chat_set_status(${r.id!}::uuid, 'visible', ${mod}::uuid, 'ok')`;
    expect((await readAs(u, "jackpot")).some((m) => m.id === r.id)).toBe(true);
    await sql`select pvp_test.chat_set_status(${r.id!}::uuid, 'deleted', ${mod}::uuid, 'gone')`;
    const [row] =
      await sql`select status, deleted_at, moderated_by from pvp_test.game_chat_messages where id = ${r.id!}`;
    expect(row.status).toBe("deleted");
    expect(row.deleted_at).not.toBeNull();
    expect(row.moderated_by).toBe(mod);
    const ev =
      await sql`select action from pvp_test.game_chat_moderation_events where message_id = ${r.id!} order by id`;
    expect(ev.map((e) => e.action)).toEqual(["HIDDEN", "RESTORED", "DELETED"]);
  });

  it("rooms are isolated", async () => {
    const u = await newUser();
    const j = await send(u, "jackpot only", "jackpot");
    const c = await send(u, "coinflip only", "coinflip");
    const jr = await readAs(u, "jackpot");
    const cr = await readAs(u, "coinflip");
    expect(jr.some((m) => m.id === c.id)).toBe(false);
    expect(cr.some((m) => m.id === j.id)).toBe(false);
  });

  it("stores SQL-injection and HTML strings literally", async () => {
    const u = await newUser();
    const evil = "'); drop table pvp_test.game_chat_messages; -- <script>x</script>";
    const r = await send(u, evil);
    const [row] = await sql`select message from pvp_test.game_chat_messages where id = ${r.id!}`;
    expect(row.message).toBe(evil);
  });

  it("20 users sending at once all succeed with unique ordered rows", async () => {
    const users = await Promise.all(Array.from({ length: 20 }, () => newUser()));
    const rs = await Promise.all(users.map((u, i) => send(u, `hello ${i}`, "coinflip")));
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(new Set(rs.map((r) => r.id)).size).toBe(20);
  });

  it("access rules: browsers read visible rows only and can never write or call chat functions", async () => {
    const pol =
      await sql`select cmd, roles::text[] roles, qual from pg_policies where schemaname = 'public' and tablename like 'game_chat%'`;
    expect(pol).toHaveLength(1);
    expect(pol[0]).toMatchObject({ cmd: "SELECT", roles: ["authenticated"] });
    expect(pol[0].qual).toMatch(/status = 'visible'/);
    const privs: string[] = [];
    for (const t of [
      "game_chat_messages",
      "game_chat_user_restrictions",
      "game_chat_moderation_events",
    ])
      for (const role of ["anon", "authenticated"])
        for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
          const [r] = await sql`select has_table_privilege(${role}, ${"public." + t}, ${p}) ok`;
          if (r.ok) privs.push(`${t}:${role}:${p}`);
        }
    expect(privs).toEqual(["game_chat_messages:authenticated:SELECT"]);
    for (const fn of ["chat_send", "chat_set_status", "chat_set_restriction", "_chat_broadcast"]) {
      const [row] =
        await sql`select bool_or(has_function_privilege('authenticated', p.oid, 'execute')) a, bool_or(has_function_privilege('anon', p.oid, 'execute')) n
        from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = ${fn}`;
      expect(row, fn).toEqual({ a: false, n: false });
    }
    const [trg] =
      await sql`select p.prosecdef, p.proconfig from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = '_chat_broadcast'`;
    expect(trg.prosecdef).toBe(true);
    expect(trg.proconfig).toContain("search_path=public");
    const rt =
      await sql`select policyname, cmd, qual, with_check from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname like 'chat rooms%'`;
    // Browsers only receive; presence is now server-counted (no browser INSERT at all).
    expect(rt.map((r) => r.cmd).sort()).toEqual(["SELECT"]);
  });
});
