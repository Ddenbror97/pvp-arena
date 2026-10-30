import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { signAdmission } from "../../src/lib/fps/ticket.ts";
import { assertStaging, connect, asUser } from "./staging-lib.mjs";
assertStaging();
const directory = path.resolve(".wrangler/preprod-us-gameplay");
fs.mkdirSync(directory, { recursive: true });
const testToken = randomBytes(32).toString("base64url");
const users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(14, 16);
const sql = connect(2),
  deployments = [],
  report = {
    started: new Date().toISOString(),
    scope:
      "US placed automated gameplay probes; not residential/mobile players or measured IP packet loss",
    regions: [],
  };
async function wrangler(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (b) => (output += b));
    child.stderr.on("data", (b) => (output += b));
    child.stdin.end(input ?? "");
    child.on("error", reject);
    child.on("exit", (code) =>
      code ? reject(Error("Regional staging worker operation failed: " + code)) : resolve(output),
    );
  });
}
let room;
let phase = "regional deployment";
async function configureRoom() {
  const [match] =
    await sql`select id,creator_id,opponent_id,stake,best_of,private,expires_at from fps_matches where id=${room.id}`;
  const config = {
    id: match.id,
    creator_id: match.creator_id,
    opponent_id: match.opponent_id,
    stake: Number(match.stake),
    best_of: match.best_of,
    private: match.private,
    expiresAt: new Date(match.expires_at).getTime(),
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        "https://pvpspinarena-fps-staging.pvpspinarena.workers.dev/internal/matches/" + room.id,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + process.env.FPS_RUNTIME_SECRET,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        },
      );
      assert.equal(response.status, 200, "Staging runtime configuration failed");
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
try {
  for (const [label, region] of [
    ["east", "aws:us-east-1"],
    ["west", "aws:us-west-2"],
  ]) {
    const name = "pvpspinarena-gameplay-us-" + label,
      file = path.join(directory, label + ".json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        name,
        main: path.resolve("scripts/fps/regional-gameplay-probe.mjs"),
        compatibility_date: "2026-10-26",
        compatibility_flags: ["global_fetch_strictly_public"],
        workers_dev: true,
        placement: { region },
        vars: { TEST_REGION: region },
      }),
    );
    deployments.push({ file, label, region, url: `https://${name}.pvpspinarena.workers.dev` });
    await wrangler(["deploy", "--config", file]);
    await wrangler(["secret", "bulk", "--config", file], JSON.stringify({ TEST_TOKEN: testToken }));
    let ready = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const r = await fetch(deployments.at(-1).url, {
          headers: { Authorization: "Bearer " + testToken },
        });
        if (r.ok) {
          ready = true;
          break;
        }
        await r.arrayBuffer();
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
    }
    assert(ready, "Regional worker propagation failed");
  }
  const before =
    await sql`select owner_id,balance from wallet_accounts where owner_id in ${sql(users.map((u) => u.id))} and kind='user_available' and account_type='real' order by owner_id`;
  phase = "synthetic match creation";
  room = (
    await asUser(
      sql,
      users[0],
      (tx) => tx`select public.fps_enter(100,9,${randomUUID()},true,null) r`,
    )
  )[0].r;
  await asUser(
    sql,
    users[1],
    (tx) => tx`select public.fps_join(${room.id}::uuid,${randomUUID()},${room.invite})`,
  );
  const runtime = "https://pvpspinarena-fps-staging.pvpspinarena.workers.dev";
  phase = "runtime configuration";
  await configureRoom();
  phase = "regional WebSocket gameplay";
  await Promise.all(
    deployments.map(async (d, i) => {
      const user = users[i];
      const ticket = await signAdmission(
        {
          v: 2,
          aud: "fps-duel",
          matchId: room.id,
          sub: user.id,
          role: "player",
          nonce: randomUUID(),
          exp: Math.min(Date.now() + 60000, user.claims.exp * 1000),
          sessionId: user.claims.session_id,
          authExpiresAt: user.claims.exp * 1000,
        },
        process.env.FPS_RUNTIME_SECRET,
      );
      const r = await fetch(d.url, {
        method: "POST",
        headers: { Authorization: "Bearer " + testToken, "Content-Type": "application/json" },
        body: JSON.stringify({ url: runtime + "/matches/" + room.id + "/socket?ticket=" + ticket }),
        signal: AbortSignal.timeout(90000),
      });
      assert.equal(r.status, 200, "Regional gameplay HTTP failure");
      const result = await r.json();
      report.regions.push({ ...result, placement: r.headers.get("cf-placement") });
      assert(result.liveSnapshots > 100, "Insufficient sustained regional gameplay");
      assert(result.ackMs.length > 50, "Insufficient regional input acknowledgments");
      assert.deepEqual(result.errors, []);
    }),
  );
  const deadline = Date.now() + 90000;
  let state;
  do {
    await new Promise((r) => setTimeout(r, 2000));
    state = (await sql`select status from fps_matches where id=${room.id}`)[0];
  } while (state.status === "FUNDED" && Date.now() < deadline);
  assert.equal(state.status, "CANCELLED");
  const after =
    await sql`select owner_id,balance from wallet_accounts where owner_id in ${sql(users.map((u) => u.id))} and kind='user_available' and account_type='real' order by owner_id`;
  assert.deepEqual(after, before);
  assert.equal(
    Number(
      (
        await sql`select count(*) n from ledger_transactions where idempotency_key=${"fps:" + room.id + ":refund"}`
      )[0].n,
    ),
    1,
  );
  report.singleRefund = true;
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  report.failurePhase = phase;
  report.failureCode = error.cause?.code;
  process.exitCode = 1;
} finally {
  report.finished = new Date().toISOString();
  for (const deployment of deployments) {
    try {
      await wrangler(["delete", "--config", deployment.file, "--force"]);
    } catch {
      report.cleanupFailure = true;
      process.exitCode = 1;
    }
  }
  if (room && !report.passed) {
    try {
      await configureRoom();
      const deadline = Date.now() + 90000;
      let status;
      do {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        status = (await sql`select status from fps_matches where id=${room.id}`)[0].status;
      } while (status === "FUNDED" && Date.now() < deadline);
      report.fixtureCleanupStatus = status;
      if (status !== "CANCELLED") report.cleanupFailure = true;
    } catch {
      report.cleanupFailure = true;
    }
  }
  await sql.end({ timeout: 3 });
  fs.writeFileSync("test-results/remediation-us-gameplay.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      regions: report.regions.map((r) => ({
        region: r.region,
        placement: r.placement,
        egressColo: r.egressColo,
        liveSnapshots: r.liveSnapshots,
      })),
      failure: report.failure,
      failurePhase: report.failurePhase,
      failureCode: report.failureCode,
      cleanupFailure: report.cleanupFailure,
    }),
  );
}
