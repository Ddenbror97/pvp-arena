import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { signAdmission } from "../../src/lib/fps/ticket.ts";
import { assertStaging, connect } from "./staging-lib.mjs";
assertStaging();
const api = process.env.SUPABASE_URL,
  runtime = "https://pvpspinarena-fps-staging.pvpspinarena.workers.dev";
const credentials = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(0, 2);
const sql = connect(2),
  report = { started: new Date().toISOString(), checks: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, timeout = 15000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(40);
  }
  throw Error("Hosted security condition timed out");
};
async function login(user) {
  let r;
  for (let attempt = 0; attempt < 4; attempt++) {
    r = await fetch(api + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    if (r.status !== 429) break;
    await r.arrayBuffer();
    console.log(JSON.stringify({ event: "auth_rate_limit_backoff", retry: attempt + 1 }));
    await sleep(60000);
  }
  if (!r.ok) throw Error("Synthetic sign-in HTTP " + r.status);
  const session = await r.json(),
    claims = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString());
  assert.equal(claims.sub, user.id);
  return { ...user, session, claims };
}
async function rpc(user, name, args) {
  const r = await fetch(api + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + user.session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw Error(name + " HTTP " + r.status);
  return r.json();
}
async function authSetting(method, body) {
  const r = await fetch("https://api.supabase.com/v1/projects/rymzkgqoekjluzmzstap/config/auth", {
    method,
    headers: {
      Authorization: "Bearer " + process.env.SUPABASE_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw Error("Staging Auth config HTTP " + r.status);
  return r.json();
}
async function shortLivedLogin(user) {
  const original = (await authSetting("GET")).jwt_exp;
  assert(Number.isInteger(original));
  fs.writeFileSync(
    ".wrangler/fps-auth-expiry-restore.json",
    JSON.stringify({ project: "rymzkgqoekjluzmzstap", jwt_exp: original }),
  );
  try {
    await authSetting("PATCH", { jwt_exp: 60 });
    for (let i = 0; i < 6; i++) {
      await sleep(5000);
      const actor = await login(user);
      if (actor.claims.exp - actor.claims.iat <= 65) return actor;
    }
    throw Error("Auth did not issue a short-lived JWT; no expiry pass claimed");
  } finally {
    await authSetting("PATCH", { jwt_exp: original });
  }
}
async function attach(room, actor, role = "player") {
  const ticket = await signAdmission(
    {
      v: 2,
      aud: "fps-duel",
      matchId: room.id,
      sub: actor.id,
      sessionId: actor.claims.session_id,
      authExpiresAt: actor.claims.exp * 1000,
      role,
      nonce: randomUUID(),
      exp: Math.min(Date.now() + 60000, actor.claims.exp * 1000),
    },
    process.env.FPS_RUNTIME_SECRET,
  );
  const c = {
    actor,
    role,
    latest: null,
    closeCode: null,
    ws: new WebSocket(
      runtime.replace("https:", "wss:") + "/matches/" + room.id + "/socket?ticket=" + ticket,
      { origin: "https://pvpspinarena-staging.pvpspinarena.workers.dev" },
    ),
  };
  room.clients.push(c);
  c.ws.on("error", () => {});
  c.ws.on("close", (code) => (c.closeCode = code));
  c.ws.on("message", (d) => {
    const f = JSON.parse(String(d));
    if (f.type === "snapshot") c.latest = f;
    if (f.type === "authorization") c.paused = f.paused;
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Error("Session socket admission timeout")), 15000);
    c.ws.once("open", () => {
      clearTimeout(t);
      resolve();
    });
    c.ws.once("error", () => {
      clearTimeout(t);
      reject(Error("Session socket admission rejected"));
    });
  });
  if (role === "player") c.ws.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
  return c;
}
const input = (seq) =>
  JSON.stringify({
    v: 1,
    type: "input",
    combatVersion: 2,
    seq,
    forward: 1,
    strafe: 0,
    yaw: 0,
    pitch: 0,
    fire: true,
    reload: true,
    weapon: "rifle",
    jump: false,
    sprint: false,
  });
async function balances() {
  return sql`select owner_id,balance from wallet_accounts where owner_id in ${sql(credentials.map((u) => u.id))} and kind='user_available' and account_type='real' order by owner_id`;
}
async function setup(a, b) {
  const before = await balances(),
    g = await rpc(a, "fps_enter", {
      p_stake: 100,
      p_best_of: 9,
      p_key: randomUUID(),
      p_private: false,
      p_invite: null,
    });
  const room = { id: g.id, clients: [], before, initialized: false };
  try {
    await rpc(b, "fps_join", { p_match: g.id, p_key: randomUUID(), p_invite: g.invite });
    const [db] = await sql`select expires_at from fps_matches where id=${g.id}`;
    const r = await fetch(runtime + "/internal/matches/" + g.id, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.FPS_RUNTIME_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: g.id,
        creator_id: a.id,
        opponent_id: b.id,
        stake: 100,
        best_of: 9,
        private: false,
        expiresAt: new Date(db.expires_at).getTime(),
      }),
    });
    assert.equal(r.status, 200);
    room.initialized = true;
    room.a = await attach(room, a);
    room.b = await attach(room, b);
    await until(() => room.a.latest?.state.phase === "live");
    return room;
  } catch (e) {
    await cleanup(room);
    throw e;
  }
}
async function cleanup(room) {
  for (const c of room.clients) c.ws.close();
  if (!room.initialized) {
    const headers = {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    };
    for (const name of ["fps_record_result", "fps_finish"]) {
      const r = await fetch(api + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_match: room.id,
          p_winner: null,
          p_score_a: 0,
          p_score_b: 0,
          p_reason: "SERVER_RESTART",
          p_runtime: room.id,
        }),
      });
      if (!r.ok) throw Error("Fixture refund HTTP " + r.status);
    }
  }
  await until(
    async () =>
      ["COMPLETED", "CANCELLED"].includes(
        (await sql`select status from fps_matches where id=${room.id}`)[0].status,
      ),
    90000,
  );
  const [g] = await sql`select status from fps_matches where id=${room.id}`;
  assert.equal(g.status, "CANCELLED");
  assert.deepEqual(await balances(), room.before);
  const [tx] =
    await sql`select count(*) n from ledger_transactions where idempotency_key=${"fps:" + room.id + ":refund"}`;
  assert.equal(Number(tx.n), 1);
  return { singleRefund: true, balancesRestored: true };
}
for (const scenario of [
  "logout",
  "global_logout",
  "admin_revocation",
  "session_expiry",
  "jwt_expiry",
  "service_unavailable",
]) {
  let room;
  const result = { name: scenario, started: new Date().toISOString() };
  try {
    const b = await login(credentials[1]);
    const a =
      scenario === "jwt_expiry"
        ? await shortLivedLogin(credentials[0])
        : await login(credentials[0]);
    const otherSession = await login(credentials[0]);
    room = await setup(a, b);
    const viewer = await attach(room, otherSession, "spectator");
    const before = room.a.latest.state.players.A;
    if (scenario === "service_unavailable") {
      try {
        await sql.unsafe(
          "revoke execute on function public.fps_check_sessions(jsonb) from service_role",
        );
        room.a.ws.send(input(5000));
        await until(() => room.a.paused === true);
        assert.equal(room.a.latest.state.players.A.lastSeq, before.lastSeq);
        await until(() => room.a.closeCode !== null && room.b.closeCode !== null, 15000);
        assert.equal(room.a.closeCode, 1013);
        assert.equal(room.b.closeCode, 1013);
      } finally {
        await sql.unsafe(
          "grant execute on function public.fps_check_sessions(jsonb) to service_role",
        );
      }
    } else {
      if (scenario === "session_expiry")
        await sql`update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${a.claims.session_id} and user_id=${a.id}`;
      else if (scenario === "jwt_expiry") {
        result.actualJwtLifetimeSeconds = a.claims.exp - a.claims.iat;
        await until(() => Date.now() >= a.claims.exp * 1000 + 100, 75000);
      } else if (scenario === "admin_revocation") {
        await sql`delete from auth.sessions where user_id=${a.id}`;
      } else {
        const scope = scenario === "global_logout" ? "global" : "local";
        const r = await fetch(api + "/auth/v1/logout?scope=" + scope, {
          method: "POST",
          headers: {
            apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
            Authorization: "Bearer " + a.session.access_token,
          },
        });
        assert.equal(r.status, 204);
      }
      const start = performance.now();
      if (room.a.ws.readyState === WebSocket.OPEN) room.a.ws.send(input(5000));
      await until(() => room.a.closeCode !== null);
      assert.equal(room.a.closeCode, 1008);
      result.closeObservedMs = performance.now() - start;
      assert.equal(room.a.latest.state.players.A.lastSeq, before.lastSeq);
      assert.equal(room.a.latest.state.players.A.ammo, before.ammo);
      if (scenario === "admin_revocation" || scenario === "global_logout") {
        await until(() => viewer.closeCode !== null);
        assert.equal(viewer.closeCode, 1008);
      } else
        assert.equal(
          viewer.ws.readyState,
          WebSocket.OPEN,
          "Another live session must remain authorized",
        );
      // A fresh real session can reconnect; the rejected commands cannot cross sessions.
      const replacement = await attach(room, await login(credentials[0]));
      await until(() => replacement.latest?.state.phase === "live");
      assert.equal(replacement.latest.state.players.A.lastSeq, before.lastSeq);
      assert.equal(replacement.latest.state.players.A.ammo, before.ammo);
    }
    Object.assign(result, await cleanup(room));
    room = null;
    result.passed = true;
  } catch (e) {
    result.passed = false;
    result.failure = e.message;
    process.exitCode = 1;
  } finally {
    if (room)
      try {
        await cleanup(room);
      } catch (e) {
        result.cleanupFailure = e.message;
        process.exitCode = 1;
      }
    result.finished = new Date().toISOString();
    report.checks.push(result);
    fs.writeFileSync(
      "test-results/remediation-hosted-session-security.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(result));
  }
}
report.invariants = (await sql`select money_real_invariants() r`)[0].r;
report.passed =
  report.checks.every((c) => c.passed && !c.cleanupFailure) &&
  Object.entries(report.invariants)
    .filter(([k]) => k.startsWith("ok_"))
    .every(([, v]) => v === true);
fs.writeFileSync(
  "test-results/remediation-hosted-session-security.json",
  JSON.stringify(report, null, 2),
);
await sql.end({ timeout: 3 });
if (!report.passed) process.exitCode = 1;
