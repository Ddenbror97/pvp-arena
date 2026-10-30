import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { assertStaging } from "./staging-lib.mjs";

assertStaging();
// This deployment never invokes the production config patcher or custom-domain routes.
async function wrangler(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (b) => (output += b));
    child.stderr.on("data", (b) => (output += b));
    child.on("error", reject);
    child.on("close", (code) => {
      // Secret values are supplied only on stdin and never printed.
      for (const name of [
        "FPS_RUNTIME_SECRET",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ACCESS_TOKEN",
        "SUPABASE_DB_PASSWORD",
      ])
        if (process.env[name]) output = output.replaceAll(process.env[name], "[REDACTED]");
      process.stdout.write(output);
      if (code) reject(Error("Staging Wrangler operation failed: " + code));
      else resolve(output);
    });
    child.stdin.end(input ?? "");
  });
}
const runtimeConfig = path.resolve(".wrangler/fps-staging-hosted/wrangler.json");
const runtime = JSON.parse(fs.readFileSync(".wrangler/fps-staging-runtime/wrangler.jsonc", "utf8"));
// Strict session reads are synchronous with simulation; keep new US rooms near Auth's primary.
runtime.vars.FPS_ROOM_REGION = "enam";
if (
  runtime.name !== "pvpspinarena-fps-staging" ||
  runtime.vars.SUPABASE_URL !== process.env.SUPABASE_URL
)
  throw Error("Unexpected runtime target");
fs.mkdirSync(path.dirname(runtimeConfig), { recursive: true });
fs.writeFileSync(runtimeConfig, JSON.stringify(runtime, null, 2));
const first = await wrangler(["deploy", "--config", runtimeConfig]);
const runtimeURL = first.match(/https:\/\/pvpspinarena-fps-staging\.[a-z0-9-]+\.workers\.dev/)?.[0];
if (!runtimeURL) throw Error("Staging runtime URL missing");
const appURL = runtimeURL.replace("pvpspinarena-fps-staging.", "pvpspinarena-staging.");
runtime.vars.ALLOWED_ORIGIN = appURL;
runtime.workers_dev = true;
fs.writeFileSync(runtimeConfig, JSON.stringify(runtime, null, 2));
await wrangler(
  ["secret", "bulk", "--config", runtimeConfig],
  JSON.stringify({
    FPS_RUNTIME_SECRET: process.env.FPS_RUNTIME_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
);
await wrangler(["deploy", "--config", runtimeConfig]);

const appConfig = path.resolve(".output/server/wrangler.json");
const cfg = JSON.parse(fs.readFileSync(appConfig, "utf8"));
cfg.name = "pvpspinarena-staging";
cfg.workers_dev = true;
delete cfg.routes;
delete cfg.triggers; // Never schedule casino/payment jobs on the disposable copy.
cfg.compatibility_flags = [
  ...new Set([
    ...(cfg.compatibility_flags ?? []),
    "nodejs_compat",
    "nodejs_compat_populate_process_env",
    "global_fetch_strictly_public",
  ]),
];
cfg.vars = Object.fromEntries(
  [
    "SUPABASE_URL",
    "SUPABASE_PROJECT_ID",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PROJECT_ID",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].map((name) => [name, process.env[name]]),
);
cfg.vars.FPS_RUNTIME_ORIGIN = runtimeURL;
fs.writeFileSync(appConfig, JSON.stringify(cfg, null, 2));
await wrangler(["deploy", "--config", appConfig]);
await wrangler(
  ["secret", "bulk", "--config", appConfig],
  JSON.stringify({
    FPS_RUNTIME_SECRET: process.env.FPS_RUNTIME_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
);
fs.writeFileSync(
  "test-results/fps-staging-deployment.json",
  JSON.stringify(
    { appURL, runtimeURL, project: process.env.SUPABASE_PROJECT_ID, at: new Date().toISOString() },
    null,
    2,
  ),
);
console.log(JSON.stringify({ appURL, runtimeURL }));
