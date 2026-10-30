import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { signAdmission } from "../../src/lib/fps/ticket.ts";
import { assertStaging, connect } from "./staging-lib.mjs";
assertStaging();
const app = "https://pvpspinarena-staging.pvpspinarena.workers.dev";
const runtime = "https://pvpspinarena-fps-staging.pvpspinarena.workers.dev";
const matchCount = Number(process.argv[2] ?? 12);
const sustainedMs = Number(process.argv[3] ?? 45000);
assert(
  [45000, 180000, 300000].includes(sustainedMs),
  "Supported gameplay durations: 45000,180000,300000ms",
);
assert([2, 5, 12, 20].includes(matchCount), "Supported bounded match counts: 2,5,12,20");
const users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(
  0,
  matchCount * 2,
);
assert.equal(
  users.length,
  matchCount * 2,
  "Provision sufficient isolated users before load testing",
);
const sql = connect(3),
  rooms = [],
  clients = [],
  errors = [];
const creation = [],
  join = [],
  admission = [],
  acks = [],
  gaps = [],
  reconnects = [],
  plannedClosures = [],
  admissionRetries = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const percentile = (a, p) =>
  a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : null;
const summary = (a) => ({
  samples: a.length,
  p50Ms: percentile(a, 0.5),
  p95Ms: percentile(a, 0.95),
  p99Ms: percentile(a, 0.99),
});
const report = {
  started: new Date().toISOString(),
  scope: `${matchCount * 2} automated authenticated identities / ${matchCount} hosted paid synthetic matches; one workstation; not regional player capacity`,
  errors,
};
const databaseSamples = [];
let metricsTimer,
  collecting = false;
async function sampleDatabase() {
  if (collecting) return;
  collecting = true;
  try {
    const [sample] = await sql`select clock_timestamp() sampled_at,
      current_setting('max_connections')::int max_connections,
      (select count(*)::int from pg_stat_activity) connections,
      (select count(*)::int from pg_stat_activity where state='active') active,
      (select count(*)::int from pg_stat_activity where wait_event_type='Lock') lock_waiting_connections,
      (select count(*)::int from pg_locks where not granted) ungranted_locks,
      (select coalesce(sum(calls),0)::text from pg_stat_statements where query ilike '%fps_check_sessions%') session_check_calls,
      (select coalesce(sum(total_exec_time),0)::text from pg_stat_statements where query ilike '%fps_check_sessions%') session_check_total_exec_ms`;
    databaseSamples.push(sample);
  } catch (error) {
    errors.push("Database instrumentation failed: " + (error.code ?? "unknown"));
  } finally {
    collecting = false;
  }
}
let timer,
  dropped = 0,
  sent = 0,
  closing = false;
async function rpc(user, name, body) {
  const start = performance.now();
  const r = await fetch(process.env.SUPABASE_URL + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + user.session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok)
    throw Error(
      name + " HTTP " + r.status + " " + String(j.message ?? j.code).match(/[A-Z_]{4,}/)?.[0],
    );
  (name === "fps_enter" ? creation : join).push(performance.now() - start);
  return j;
}
async function socket(c, reconnect = false) {
  const start = performance.now();
  const ticket = await signAdmission(
    {
      v: 2,
      aud: "fps-duel",
      matchId: c.room.id,
      sub: c.user.id,
      sessionId: c.user.claims.session_id,
      authExpiresAt: c.user.claims.exp * 1000,
      role: "player",
      nonce: randomUUID(),
      exp: Date.now() + 60000,
    },
    process.env.FPS_RUNTIME_SECRET,
  );
  const ws = new WebSocket(
    runtime.replace("https:", "wss:") + "/matches/" + c.room.id + "/socket?ticket=" + ticket,
    { origin: app },
  );
  c.ws = ws;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error("Socket admission timeout")), 20000);
    ws.once("error", () => {
      clearTimeout(timeout);
      reject(Error("Socket transport error"));
    });
    ws.once("unexpected-response", (_, r) => {
      clearTimeout(timeout);
      reject(Error("Socket HTTP " + r.statusCode));
    });
    ws.once("open", () => {
      clearTimeout(timeout);
      admission.push(performance.now() - start);
      resolve();
    });
  });
  let first = true;
  ws.on("message", (b) => {
    const f = JSON.parse(b.toString());
    if (f.type !== "snapshot") return;
    if (reconnect && first) {
      reconnects.push(performance.now() - start);
      first = false;
    }
    c.state = f.state;
    if (f.state.phase !== "live") return;
    const now = performance.now();
    c.live++;
    if (c.lastAt) gaps.push(now - c.lastAt);
    c.lastAt = now;
    c.firstTick ??= f.state.tick;
    c.lastTick = f.state.tick;
    c.firstAt ??= now;
    const ack = f.state.players[c.seat].lastSeq;
    if (c.pending.has(ack)) acks.push(now - c.pending.get(ack));
    for (const seq of c.pending.keys()) if (seq <= ack) c.pending.delete(seq);
  });
  ws.on("error", () => {
    if (!closing) errors.push("WebSocket error");
  });
  ws.on("close", (code) => {
    if (!closing && !c.intentional) errors.push("Unexpected WebSocket close " + code);
  });
  if (!reconnect) ws.send(JSON.stringify({ v: 1, type: "ready" }));
}
async function admit(c, reconnect = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await socket(c, reconnect);
      return;
    } catch (error) {
      if (!/Socket HTTP 503/.test(error.message) || attempt === 2) throw error;
      admissionRetries.push({ attempt: attempt + 1, status: 503 });
      // Mirror the actual browser's bounded reconnect delay. Each attempt
      // issues a new one-use admission and repeats authoritative Auth checks.
      await sleep(500 * 2 ** attempt);
    }
  }
}
try {
  await sampleDatabase();
  metricsTimer = setInterval(() => void sampleDatabase(), 1000);
  const before =
    await sql`select owner_id,balance from wallet_accounts where owner_id in ${sql(users.map((u) => u.id))} and kind='user_available' and account_type='real' order by owner_id`;
  const setupResults = await Promise.allSettled(
    Array.from({ length: matchCount }, async (_, i) => {
      const a = users[i * 2],
        b = users[i * 2 + 1];
      const room = await rpc(a, "fps_enter", {
        p_stake: 100,
        p_best_of: 9,
        p_key: randomUUID(),
        p_private: true,
        p_invite: null,
      });
      rooms.push(room);
      await rpc(b, "fps_join", { p_match: room.id, p_key: randomUUID(), p_invite: room.invite });
      const r = await fetch(runtime + "/internal/matches/" + room.id, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.FPS_RUNTIME_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: room.id,
          creator_id: a.id,
          opponent_id: b.id,
          stake: 100,
          best_of: 9,
          private: true,
          expiresAt: Date.now() + 1200000,
        }),
      });
      assert.equal(r.status, 200);
      for (const [user, seat] of [
        [a, "A"],
        [b, "B"],
      ]) {
        const c = { user, seat, room, seq: 0, pending: new Map(), live: 0, intentional: false };
        clients.push(c);
        await admit(c);
      }
    }),
  );
  const setupFailure = setupResults.find((result) => result.status === "rejected");
  if (setupFailure) throw setupFailure.reason;
  assert.equal(clients.length, matchCount * 2);
  console.log(`${clients.length} hosted sockets admitted across ${rooms.length} synthetic matches`);
  const start = performance.now();
  timer = setInterval(() => {
    for (const [i, c] of clients.entries()) {
      if (c.ws.readyState !== WebSocket.OPEN || c.intentional) continue;
      const seq = ++c.seq,
        impaired = i % 2 === 1;
      if (impaired && seq % 10 === 0) {
        dropped++;
        continue;
      }
      const input = {
        v: 1,
        type: "input",
        seq,
        forward: Math.sin(seq / 90) * 0.6,
        strafe: Math.cos(seq / 90) * 0.6,
        yaw: c.seat === "A" ? Math.PI / 2 : -Math.PI / 2,
        pitch: 0,
        fire: seq % 10 < 4,
        reload: seq % 180 === 0,
        weapon: "rifle",
        jump: seq % 120 === 0,
        sprint: false,
        crouch: seq % 240 < 60,
      };
      const send = () => {
        if (c.ws.readyState === WebSocket.OPEN && !c.intentional) {
          c.pending.set(seq, performance.now());
          c.ws.send(JSON.stringify(input));
          sent++;
        }
      };
      if (impaired) setTimeout(send, 100 + (seq % 5) * 25);
      else send();
    }
  }, 34);
  await sleep(15000);
  await Promise.all(
    clients.slice(0, 4).map(
      (c) =>
        new Promise((resolve, reject) => {
          c.intentional = true;
          const started = performance.now();
          const timeout = setTimeout(
            () => reject(Error("Planned reconnect close handshake timed out")),
            5000,
          );
          c.ws.once("close", (code) => {
            clearTimeout(timeout);
            plannedClosures.push({ code, ms: performance.now() - started });
            if (code !== 1000) reject(Error("Planned reconnect closed abnormally: " + code));
            else resolve();
          });
          // Match the browser's explicit normal close; wait for its handshake before
          // reusing this client's identity/state for a replacement socket.
          c.ws.close(1000, "Synthetic reconnect");
        }),
    ),
  );
  await sleep(2500);
  await Promise.all(
    clients.slice(0, 4).map(async (c) => {
      await admit(c, true);
      c.intentional = false;
    }),
  );
  await sleep(Math.max(0, sustainedMs - (performance.now() - start)));
  clearInterval(timer);
  assert(
    clients.every((c) => c.live > 100),
    "Each client must receive sustained live snapshots",
  );
  assert.equal(errors.length, 0);
  assert.equal(reconnects.length, 4);
  report.concurrentMatches = rooms.length;
  report.concurrentClients = clients.length;
  report.durationMs = performance.now() - start;
  report.creation = summary(creation);
  report.join = summary(join);
  report.admission = summary(admission);
  report.inputAck = summary(acks);
  report.snapshotGap = summary(gaps);
  report.reconnect = summary(reconnects);
  report.plannedClosures = plannedClosures;
  report.admissionRetries = admissionRetries;
  report.sentInputs = sent;
  report.deliberatelyDroppedInputMessages = dropped;
  report.networkImpairment =
    "Half clients delay outgoing messages 100..200ms and discard every tenth input. This simulates application delivery impairment, not measured TCP/IP packet loss or a US end-user last mile.";
  closing = true;
  for (const c of clients) c.ws.close();
  const deadline = Date.now() + 90000;
  let rows;
  do {
    await sleep(2000);
    rows = await sql`select id,status from fps_matches where id in ${sql(rooms.map((r) => r.id))}`;
  } while (
    rows.some((r) => !["CANCELLED", "COMPLETED"].includes(r.status)) &&
    Date.now() < deadline
  );
  assert(
    rows.every((r) => r.status === "CANCELLED"),
    "Both disconnected seats must refund, not pay a winner",
  );
  const after =
    await sql`select owner_id,balance from wallet_accounts where owner_id in ${sql(users.map((u) => u.id))} and kind='user_available' and account_type='real' order by owner_id`;
  assert.deepEqual(after, before);
  const txs =
    await sql`select idempotency_key,count(*) n from ledger_transactions where idempotency_key in ${sql(rooms.map((r) => "fps:" + r.id + ":refund"))} group by 1`;
  assert.equal(txs.length, matchCount);
  assert(txs.every((t) => Number(t.n) === 1));
  report.refundedMatches = rows.length;
  report.invariants = (await sql`select money_real_invariants() r`)[0].r;
  for (const [k, v] of Object.entries(report.invariants))
    if (k.startsWith("ok_")) assert.equal(v, true);
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = e.message;
  process.exitCode = 1;
  console.log("FAIL " + e.message);
} finally {
  closing = true;
  clearInterval(timer);
  clearInterval(metricsTimer);
  while (collecting) await sleep(20);
  report.databaseSamples = databaseSamples;
  report.plannedClosures ??= plannedClosures;
  report.admissionRetries ??= admissionRetries;
  for (const c of clients) c.ws?.close();
  report.finished = new Date().toISOString();
  fs.writeFileSync(
    `test-results/remediation-hosted-load-${matchCount}${sustainedMs === 45000 ? "" : "-" + sustainedMs}.json`,
    JSON.stringify(report, null, 2),
  );
  await sql.end({ timeout: 3 });
  console.log(
    JSON.stringify({ passed: report.passed, rooms: rooms.length, clients: clients.length }),
  );
}
