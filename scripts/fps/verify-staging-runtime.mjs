import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../../src/lib/fps/ticket.ts";
import { connect, asUser, asService, assertStaging } from "./staging-lib.mjs";
assertStaging();
const sql = connect(4),
  [A, B] = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(14, 16),
  report = { checks: [] };
let mf;
const rpc = (u, name, args) =>
  asUser(
    sql,
    u,
    async (tx) =>
      (
        await tx.unsafe(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) r`,
          args,
        )
      )[0].r,
  );
const service = (name, args) =>
  asService(
    sql,
    async (tx) =>
      (
        await tx.unsafe(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) r`,
          args,
        )
      )[0].r,
  );
const state = async (g) => (await sql`select * from public.fps_matches where id=${g.id}`)[0];
const wallets = async () =>
  await sql`select owner_id,kind,balance from public.wallet_accounts where owner_id in (${A.id},${B.id}) and account_type='real' order by owner_id,kind`;
const funded = async () => {
  const g = await rpc(A, "fps_enter", [100, 5, randomUUID(), true, null]);
  await rpc(B, "fps_join", [g.id, randomUUID(), g.invite]);
  return state(g);
};
const until = async (fn, timeout = 25000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const r = await fn();
    if (r) return r;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw Error("Timed out verifying staging runtime recovery");
};
const pass = (name) => {
  console.log("PASS " + name);
  report.checks.push({ name, passed: true });
};
try {
  const stranded =
    await sql`select * from public.fps_matches where status='FUNDED' and creator_id=${A.id} and opponent_id=${B.id} and not result_recorded`;
  for (const old of stranded) {
    await service("fps_record_result", [old.id, null, 0, 0, "SERVER_RESTART", old.id]);
    await service("fps_finish", [old.id, null, 0, 0, "SERVER_RESTART", old.id]);
  }
  const g = await funded();
  await service("fps_record_result", [g.id, A.id, 3, 1, "ROUNDS", g.id]);
  const maintenance = await fetch("http://127.0.0.1:8789/__scheduled?cron=*%20*%20*%20*%20*");
  assert(maintenance.ok);
  await until(async () => (await state(g)).status === "COMPLETED");
  assert.equal(Number((await state(g)).payout_amount), 190);
  pass("actual scheduled Worker recovers a committed unpaid result through Supabase");
  const before = await wallets(),
    crash = await funded(),
    bundle = await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: "es2022",
    });
  const persistence = path.resolve(".wrangler/fps-staging-faults/" + randomUUID());
  const options = () =>
    convertV4MiniflareOptions({
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: "2026-10-26",
      durableObjects: { DUELS: { className: "DuelRoom", useSQLite: true } },
      resourcePersistencePath: persistence,
      bindings: {
        FPS_RUNTIME_SECRET: process.env.FPS_RUNTIME_SECRET,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        ALLOWED_ORIGIN: "http://127.0.0.1:4180",
      },
    });
  const config = {
    id: crash.id,
    creator_id: A.id,
    opponent_id: B.id,
    best_of: 5,
    stake: 100,
    private: true,
    expiresAt: Date.parse(crash.expires_at),
  };
  const initialize = () =>
    mf.dispatchFetch("https://runtime.test/internal/matches/" + crash.id, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.FPS_RUNTIME_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
  mf = new Miniflare(options());
  await mf.ready;
  assert.equal((await initialize()).status, 200);
  const ticket = async (sub, role = "player") =>
    signAdmission(
      {
        v: 2,
        aud: "fps-duel",
        matchId: crash.id,
        sub,
        sessionId: [A, B].find((u) => u.id === sub)?.claims.session_id ?? randomUUID(),
        authExpiresAt:
          ([A, B].find((u) => u.id === sub)?.claims.exp ?? Math.floor(Date.now() / 1000) + 3600) *
          1000,
        role,
        nonce: randomUUID(),
        exp: Date.now() + 60000,
      },
      process.env.FPS_RUNTIME_SECRET,
    );
  const connectSocket = async (t) =>
    mf.dispatchFetch(
      "https://runtime.test/matches/" + crash.id + "/socket?ticket=" + encodeURIComponent(t),
      { headers: { Upgrade: "websocket", Origin: "http://127.0.0.1:4180" } },
    );
  const spectator = await connectSocket(await ticket(randomUUID(), "spectator"));
  assert.equal(spectator.status, 403);
  pass("private runtime rejects a validly signed spectator ticket");
  const ta = await ticket(A.id),
    ra = await connectSocket(ta),
    rb = await connectSocket(await ticket(B.id));
  assert.equal(ra.status, 101);
  assert.equal(rb.status, 101);
  assert.equal((await connectSocket(ta)).status, 403);
  pass("one-time admission ticket cannot be replayed");
  const a = ra.webSocket,
    b = rb.webSocket;
  let frame;
  a.accept();
  b.accept();
  b.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(String(e.data));
      if (data.type === "snapshot") frame = data;
    } catch {}
  });
  a.send('{"v":1,"type":"ready"}');
  b.send('{"v":1,"type":"ready"}');
  await until(() => frame?.state.phase === "live");
  await new Promise((r) => setTimeout(r, 2200));
  a.send(
    '{"v":1,"type":"input","seq":0,"forward":0,"strafe":0,"yaw":0,"pitch":0,"fire":false,"reload":false,"weapon":"rifle","jump":false,"sprint":false,"hp":0}',
  );
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(frame.state.players.A.hp, 100);
  assert.equal(frame.state.players.B.hp, 100);
  pass("forged health input never changes authoritative health");
  await mf.dispose();
  mf = new Miniflare(options());
  await mf.ready;
  const restarted = await initialize();
  assert.equal(restarted.status, 200);
  assert.equal(
    (await restarted.json()).phase,
    "cancelled",
    "the persisted live checkpoint must be restored and cancelled",
  );
  await until(async () => (await state(crash)).status === "CANCELLED", 30000);
  const after = await state(crash);
  assert.equal(after.reason, "SERVER_RESTART");
  assert.equal(after.result_recorded, true);
  assert.deepEqual(await wallets(), before);
  assert.equal(
    Number(
      (
        await sql`select count(*) n from public.ledger_transactions where idempotency_key=${"fps:" + crash.id + ":refund"}`
      )[0].n,
    ),
    1,
  );
  pass("restart of a checkpointed live runtime refunds once through the actual Supabase ledger");
  report.invariants = (await sql`select public.money_real_invariants() r`)[0].r;
  for (const [k, v] of Object.entries(report.invariants))
    if (k.startsWith("ok_")) assert.equal(v, true, k);
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = { message: e.message, code: e.code };
  console.log(JSON.stringify({ failed: report.failure }));
  process.exitCode = 1;
} finally {
  await mf?.dispose();
  await sql.end({ timeout: 3 });
  fs.writeFileSync("test-results/fps-staging-runtime-faults.json", JSON.stringify(report, null, 2));
}
