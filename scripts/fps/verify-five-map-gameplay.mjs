import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../../src/lib/fps/ticket.ts";
import { assertStaging, connect, asUser, asService } from "./staging-lib.mjs";
assertStaging();
const bundle = await build({
  entryPoints: ["workers/fps/index.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const registry = await build({
  entryPoints: ["src/lib/fps/maps/registry.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { MAP_IDS } = await import(
  "data:text/javascript;base64," + Buffer.from(registry.outputFiles[0].text).toString("base64")
);
const cash = process.argv.includes("--cash");
const botBundle = await build({
  entryPoints: ["src/lib/fps/practice-bot.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { createPracticeBot } = await import(
  "data:text/javascript;base64," + Buffer.from(botBundle.outputFiles[0].text).toString("base64")
);
const users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json"));
const sql = connect(6),
  origin = "http://127.0.0.1:4180",
  secret = process.env.FPS_RUNTIME_SECRET;
assert(secret);
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-10-26",
    compatibilityFlags: ["nodejs_compat"],
    durableObjects: { DUELS: { className: "DuelRoom", useSQLite: true } },
    bindings: {
      FPS_RUNTIME_SECRET: secret,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ALLOWED_ORIGIN: origin,
    },
  }),
);
const selected = process.argv.find((a) => a.startsWith("--map="))?.slice(6);
if (selected) assert(MAP_IDS.includes(selected));
const rows = [];
async function play(mapId) {
  const index = MAP_IDS.indexOf(mapId),
    u = users[cash ? 16 + 2 * index : 26 + index],
    v = cash ? users[17 + 2 * index] : null,
    started = Date.now();
  let id, ws, other, timer;
  const bot = createPracticeBot();
  const rpc = (name, args) =>
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
  try {
    const before = (
      await sql`select (select coalesce(sum(balance),0)::text from public.wallet_accounts where owner_id=${u.id}) balance,(select count(*)::int from public.ledger_transactions where user_id=${u.id}) transactions,(select row_to_json(r) from public.fps_ratings r where user_id=${u.id}) rating`
    )[0];
    const g = cash
      ? await rpc("fps_enter", [100, 13, randomUUID(), true, null])
      : await rpc("fps_practice_start", [randomUUID()]);
    id = g.id;
    if (cash) {
      await asUser(
        sql,
        v,
        async (tx) => tx`select public.fps_join(${id}::uuid,${randomUUID()},${g.invite})`,
      );
      const row = (await sql`select * from public.fps_matches where id=${id}`)[0];
      Object.assign(g, row);
    }
    const response = await mf.dispatchFetch("http://runtime.test/internal/matches/" + id, {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        creator_id: g.creator_id,
        opponent_id: g.opponent_id,
        practice: !cash,
        private: true,
        best_of: 13,
        stake: cash ? 100 : 0,
        expiresAt: Date.parse(g.expires_at),
        map_id: mapId,
      }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).mapId, mapId);
    const ticket = await signAdmission(
      {
        v: 2,
        aud: "fps-duel",
        matchId: id,
        sub: u.id,
        sessionId: u.claims.session_id,
        authExpiresAt: u.claims.exp * 1000,
        role: "player",
        nonce: randomUUID(),
        exp: Date.now() + 60000,
      },
      secret,
    );
    const r = await mf.dispatchFetch(
      "http://runtime.test/matches/" + id + "/socket?ticket=" + encodeURIComponent(ticket),
      { headers: { Upgrade: "websocket", Origin: origin } },
    );
    assert.equal(r.status, 101);
    ws = r.webSocket;
    ws.accept();
    let frame,
      seq = 0;
    const rounds = new Set(),
      positions = new Set();
    ws.addEventListener("message", (e) => {
      const d = JSON.parse(String(e.data));
      if (d.type === "snapshot") {
        frame = d;
        rounds.add(d.state.round);
        const b = d.state.players.B;
        positions.add(Math.round(b.x) + ":" + Math.round(b.z));
      }
    });
    ws.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    let otherFrame;
    if (cash) {
      const t = await signAdmission(
        {
          v: 2,
          aud: "fps-duel",
          matchId: id,
          sub: v.id,
          sessionId: v.claims.session_id,
          authExpiresAt: v.claims.exp * 1000,
          role: "player",
          nonce: randomUUID(),
          exp: Date.now() + 60000,
        },
        secret,
      );
      const r = await mf.dispatchFetch(
        "http://runtime.test/matches/" + id + "/socket?ticket=" + encodeURIComponent(t),
        { headers: { Upgrade: "websocket", Origin: origin } },
      );
      assert.equal(r.status, 101);
      other = r.webSocket;
      other.accept();
      other.addEventListener("message", (e) => {
        const d = JSON.parse(String(e.data));
        if (d.type === "snapshot") otherFrame = d;
      });
      other.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    }
    timer = setInterval(() => {
      if (cash && otherFrame?.state.phase === "live" && frame) {
        const state = {
          ...otherFrame.state,
          players: { A: frame.state.players.A, B: otherFrame.state.players.B },
        };
        other.send(JSON.stringify(bot.input(state, otherFrame.serverNow)));
      }
      if (frame?.state.phase === "live")
        ws.send(
          JSON.stringify({
            v: 1,
            type: "input",
            combatVersion: 2,
            round: frame.state.round,
            seq: ++seq,
            forward: 0,
            strafe: 0,
            yaw: frame.state.players.A.yaw,
            pitch: 0,
            fire: false,
            reload: false,
            weapon: "rifle",
            jump: false,
            sprint: false,
          }),
        );
    }, 100);
    const deadline = Date.now() + 600000;
    let nextLog = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (frame?.state.phase === "completed" && frame.settled) break;
      if (Date.now() > nextLog) {
        console.log(
          JSON.stringify({
            mapId,
            phase: frame?.state.phase,
            round: frame?.state.round,
            score: frame?.state.score,
          }),
        );
        nextLog = Date.now() + 30000;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.equal(frame?.state.phase, "completed");
    assert.equal(frame.settled, true);
    assert.equal(Math.max(frame.state.score.A, frame.state.score.B), 7);
    assert(rounds.size >= 7);
    assert(positions.size > 3);
    const db = cash
      ? (
          await sql`select status,score_a,score_b,payout_amount,fee_amount from public.fps_matches where id=${id}`
        )[0]
      : (
          await sql`select status,score_a,score_b from fps_private.practice_matches where id=${id}`
        )[0];
    assert.equal(db.status, "COMPLETED");
    assert.equal(Math.max(db.score_a, db.score_b), 7);
    const after = (
      await sql`select (select coalesce(sum(balance),0)::text from public.wallet_accounts where owner_id=${u.id}) balance,(select count(*)::int from public.ledger_transactions where user_id=${u.id}) transactions,(select row_to_json(r) from public.fps_ratings r where user_id=${u.id}) rating`
    )[0];
    if (cash) {
      assert.equal(Number(db.payout_amount), 190);
      assert.equal(Number(db.fee_amount), 10);
      const unbalanced =
        await sql`select tx_id from public.ledger_postings where tx_id in(select id from public.ledger_transactions where idempotency_key=${"fps:" + id + ":settlement"}) group by tx_id having sum(amount)<>0`;
      assert.equal(unbalanced.length, 0);
    } else assert.deepEqual(after, before);
    return {
      mapId,
      passed: true,
      rounds: [...rounds],
      score: frame.state.score,
      botPositions: positions.size,
      ms: Date.now() - started,
      financialAndRatingUnchanged: !cash,
      syntheticCashSettlement: cash,
    };
  } catch (e) {
    return { mapId, passed: false, error: e.message, ms: Date.now() - started };
  } finally {
    clearInterval(timer);
    try {
      ws?.close();
      other?.close();
    } catch {}
    if (id) {
      if (!cash) await rpc("fps_cancel", [id]).catch(() => {});
      else {
        const g = (
          await sql`select status,result_recorded from public.fps_matches where id=${id}`
        )[0];
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
        if (g.status === "WAITING") await rpc("fps_cancel", [id]);
        else if (g.status === "FUNDED") {
          if (!g.result_recorded)
            await service("fps_record_result", [id, null, 0, 0, "SERVER_RESTART", id]);
          const intent = (
            await sql`select winner_id,score_a,score_b,reason,runtime_id from public.fps_result_intents where match_id=${id}`
          )[0];
          await service("fps_finish", [
            id,
            intent.winner_id,
            intent.score_a,
            intent.score_b,
            intent.reason,
            intent.runtime_id,
          ]);
        }
      }
    }
  }
}
try {
  await mf.ready;
  rows.push(...(await Promise.all((selected ? [selected] : MAP_IDS).map(play))));
  const report = {
    project: process.env.SUPABASE_PROJECT_ID,
    at: new Date().toISOString(),
    passed: rows.every((r) => r.passed),
    rows,
  };
  fs.writeFileSync(
    cash
      ? "test-results/fps-five-map-cash-gameplay.json"
      : "test-results/fps-five-map-complete-gameplay.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode = 1;
} finally {
  await mf.dispose();
  await sql.end();
}
