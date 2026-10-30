import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(
  fs.readFileSync(
    "C:/Users/Wesc9/AppData/Roaming/xdg.config/.wrangler/config/default.toml",
    "utf8",
  ),
)[1];
const name = "pvpspinarena-rollback-rehearsal";
const endpoint =
  "https://api.cloudflare.com/client/v4/accounts/99b13936a7e1cf50c85e15d7b360ca63/workers/scripts/" +
  name;
const probeToken = randomBytes(32).toString("base64url");
const url = `https://${name}.pvpspinarena.workers.dev`;
const oldDirectory = path.resolve(".wrangler/production-rollback-artifact");
const settings = JSON.parse(
  fs.readFileSync(path.join(oldDirectory, "settings.private.json"), "utf8"),
);
const report = {
  started: new Date().toISOString(),
  productionVersion: "49556866-a68b-4f64-96ab-f17d918ddae5",
  scope:
    "Exact archived production modules -> candidate modules -> provider version rollback, on a private temporary Worker using Fresh staging only",
  probes: [],
};
let created = false;
async function api(suffix, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", "Bearer " + token);
  const response = await fetch(endpoint + suffix, { ...options, headers });
  const body = await response.json();
  if (!response.ok || !body.success)
    throw Error(
      "Isolated rollback API failed: " +
        response.status +
        " " +
        JSON.stringify(body.errors?.map((e) => ({ code: e.code, message: e.message }))),
    );
  return body.result;
}
async function upload(directory, revision) {
  const form = new FormData();
  const bindings = [
    ...[
      "SUPABASE_URL",
      "SUPABASE_PROJECT_ID",
      "SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PROJECT_ID",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
    ].map((key) => ({
      type: "plain_text",
      name: key,
      text: process.env[key] ?? process.env[key.replace(/^VITE_/, "")],
    })),
    {
      type: "plain_text",
      name: "FPS_RUNTIME_ORIGIN",
      text: "https://pvpspinarena-fps-staging.pvpspinarena.workers.dev",
    },
    {
      type: "secret_text",
      name: "SUPABASE_SERVICE_ROLE_KEY",
      text: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    { type: "secret_text", name: "FPS_RUNTIME_SECRET", text: process.env.FPS_RUNTIME_SECRET },
    { type: "secret_text", name: "PROBE_TOKEN", text: probeToken },
    // Only the original public asset responses are reused. All backend Supabase
    // traffic points at Fresh; no payment credentials or cron jobs are copied.
    { type: "service", name: "ASSETS", service: "pvpspinarena" },
  ];
  form.append(
    "metadata",
    JSON.stringify({
      main_module: "rollback-guard.mjs",
      compatibility_date: settings.compatibility_date,
      compatibility_flags: settings.compatibility_flags,
      bindings,
    }),
  );
  const files = fs
    .readdirSync(directory, { recursive: true })
    .filter((file) => /\.(mjs|wasm)$/.test(file));
  for (const file of files) {
    const mime = file.endsWith(".wasm") ? "application/wasm" : "application/javascript+module";
    form.append(
      file.replaceAll("\\", "/"),
      new Blob([fs.readFileSync(path.join(directory, file))], { type: mime }),
      file.replaceAll("\\", "/"),
    );
  }
  const guard = `import handler from './index.mjs';export default {async fetch(request,env,ctx){if(request.headers.get('Authorization')!=='Bearer '+env.PROBE_TOKEN)return new Response('Forbidden',{status:403});const response=await handler.fetch(request,env,ctx);const headers=new Headers(response.headers);headers.set('X-Rollback-Probe',${JSON.stringify(revision)});return new Response(response.body,{status:response.status,headers});}};`;
  form.append(
    "rollback-guard.mjs",
    new Blob([guard], { type: "application/javascript+module" }),
    "rollback-guard.mjs",
  );
  await api("", { method: "PUT", body: form });
  created = true;
  await api("/subdomain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
  const deployments = await api("/deployments");
  return deployments.deployments[0].versions[0].version_id;
}
async function probe(revision) {
  for (const pathname of ["/", "/guides", "/fps-duel"]) {
    // The verified current production build predates FPS and returns 404 here.
    // Rolling back withdraws the new route; the candidate must render it.
    const expectedStatus = revision === "baseline" && pathname === "/fps-duel" ? 404 : 200;
    let response;
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        response = await fetch(url + pathname, {
          headers: { Authorization: "Bearer " + probeToken },
          signal: AbortSignal.timeout(20000),
        });
        if (
          response.status === expectedStatus &&
          response.headers.get("X-Rollback-Probe") === revision
        )
          break;
        await response.arrayBuffer();
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.equal(response?.status, expectedStatus, "Rollback SSR health failure");
    assert.equal(response.headers.get("X-Rollback-Probe"), revision);
    const html = await response.text();
    assert(html.includes("<html"), "Expected rendered application HTML");
    report.probes.push({
      revision,
      path: pathname,
      status: response.status,
      htmlSha256: createHash("sha256").update(html).digest("hex"),
    });
  }
}
try {
  report.isolatedBaselineVersion = await upload(oldDirectory, "baseline");
  await probe("baseline");
  console.log("Exact production baseline modules passed private isolated SSR checks");
  report.isolatedCandidateVersion = await upload(path.resolve(".output/server"), "candidate");
  await probe("candidate");
  console.log("Candidate modules passed the same isolated SSR checks");
  await api("/deployments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strategy: "percentage",
      versions: [{ version_id: report.isolatedBaselineVersion, percentage: 100 }],
    }),
  });
  await probe("baseline");
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  if (created)
    try {
      await api("", { method: "DELETE" });
      report.temporaryWorkerDeleted = true;
    } catch {
      report.cleanupFailure = true;
      process.exitCode = 1;
    }
  report.finished = new Date().toISOString();
  fs.writeFileSync(
    "test-results/remediation-worker-rollback.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      probes: report.probes.length,
      temporaryWorkerDeleted: report.temporaryWorkerDeleted,
      failure: report.failure,
    }),
  );
}
