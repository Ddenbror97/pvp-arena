import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

// Local capacity smoke, not a production capacity assertion. Never contacts Supabase.
const count = Number(process.env.FPS_BENCH_ROOMS ?? 10);
if (!Number.isInteger(count) || count < 1 || count > 50)
  throw Error("FPS_BENCH_ROOMS must be 1..50");
const secret = "isolated-benchmark-".repeat(4),
  origin = "https://benchmark.test";
const output = await build({
  entryPoints: ["workers/fps/index.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
const runtime = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: output.outputFiles[0].text,
    compatibilityDate: "2026-10-26",
    durableObjects: { DUELS: { className: "DuelRoom", useSQLite: true } },
    bindings: {
      FPS_RUNTIME_SECRET: secret,
      SUPABASE_URL: "https://isolated.test",
      SUPABASE_SERVICE_ROLE_KEY: "test-only",
      ALLOWED_ORIGIN: origin,
    },
    outboundService: () => Response.json({ ok: true }),
  }),
);
const clients = [],
  latencies = [];
let timer;
try {
  await runtime.ready;
  for (let room = 0; room < count; room++) {
    const id = randomUUID(),
      ids = [randomUUID(), randomUUID()];
    const response = await runtime.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        id,
        creator_id: ids[0],
        opponent_id: ids[1],
        stake: 0,
        best_of: 5,
        private: false,
        expiresAt: Date.now() + 1200000,
      }),
    });
    if (response.status !== 200) throw Error("Initialization failed");
    for (const sub of ids) {
      const body = Buffer.from(
        JSON.stringify({
          v: 1,
          aud: "fps-duel",
          matchId: id,
          sub,
          role: "player",
          nonce: randomUUID(),
          exp: Date.now() + 60000,
        }),
      ).toString("base64url");
      const ticket = `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
      const response = await runtime.dispatchFetch(
        `https://runtime.test/matches/${id}/socket?ticket=${ticket}`,
        { headers: { Upgrade: "websocket", Origin: origin } },
      );
      if (response.status !== 101) throw Error("Admission failed");
      const ws = response.webSocket;
      ws.accept();
      const client = {
        ws,
        seq: 0,
        pending: new Map(),
        first: null,
        last: null,
        snapshots: 0,
        bytes: 0,
        seat: sub === ids[0] ? "A" : "B",
      };
      clients.push(client);
      ws.addEventListener("message", (event) => {
        const f = JSON.parse(String(event.data));
        if (f.type !== "snapshot" || f.state.phase !== "live") return;
        client.bytes += String(event.data).length;
        client.snapshots++;
        client.first ??= { at: performance.now(), tick: f.state.tick };
        client.last = { at: performance.now(), tick: f.state.tick };
        const ack = f.state.players[client.seat].lastSeq;
        if (client.pending.has(ack)) latencies.push(performance.now() - client.pending.get(ack));
        for (const seq of client.pending.keys()) if (seq <= ack) client.pending.delete(seq);
      });
    }
  }
  timer = setInterval(() => {
    for (const client of clients) {
      client.pending.set(++client.seq, performance.now());
      client.ws.send(
        JSON.stringify({
          v: 1,
          type: "input",
          seq: client.seq,
          forward: 0,
          strafe: 0,
          yaw: 0,
          pitch: 0,
          fire: false,
          reload: false,
          weapon: "rifle",
          jump: false,
          sprint: false,
        }),
      );
    }
  }, 34);
  for (const c of clients) c.ws.send(JSON.stringify({ v: 1, type: "ready" }));
  await new Promise((resolve) => setTimeout(resolve, 8500));
  if (clients.some((c) => !c.first || !c.last || c.snapshots < 20))
    throw Error("Missing live samples");
  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
  const rates = clients.map((c) => ({
    tickHz: ((c.last.tick - c.first.tick) * 1000) / (c.last.at - c.first.at),
    snapshotHz: ((c.snapshots - 1) * 1000) / (c.last.at - c.first.at),
  }));
  latencies.sort((a, b) => a - b);
  const report = {
    scope: "local workerd transport smoke; no auth provider, database, funds or Internet latency",
    rooms: count,
    clients: clients.length,
    meanTickHz: mean(rates.map((r) => r.tickHz)),
    meanSnapshotHz: mean(rates.map((r) => r.snapshotHz)),
    localAckP50Ms: latencies[Math.floor(latencies.length * 0.5)],
    localAckP95Ms: latencies[Math.floor(latencies.length * 0.95)],
    ackSamples: latencies.length,
    serverCpuMemory: "not measured",
    productionCapacity: "not established",
  };
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/fps-runtime-benchmark.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  clearInterval(timer);
  for (const c of clients) c.ws.close();
  await runtime.dispose();
}
