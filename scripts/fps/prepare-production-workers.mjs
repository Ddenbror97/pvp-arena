import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const ref = "dkyabirifoixnfbmheay";
assert.equal(process.env.SUPABASE_PROJECT_ID, ref);
assert.equal(process.env.SUPABASE_URL, `https://${ref}.supabase.co`);
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(
  fs.readFileSync(
    "C:/Users/Wesc9/AppData/Roaming/xdg.config/.wrangler/config/default.toml",
    "utf8",
  ),
)[1];
const account = "99b13936a7e1cf50c85e15d7b360ca63";
async function read(url) {
  const response = await fetch("https://api.cloudflare.com/client/v4" + url, {
    headers: { Authorization: "Bearer " + token },
  });
  const body = await response.json();
  if (!response.ok || !body.success)
    throw Error("Production configuration read HTTP " + response.status);
  return body.result;
}
const base = `/accounts/${account}/workers/scripts/pvpspinarena`;
const settings = await read(base + "/settings");
const schedules = await read(base + "/schedules");
const zones = await read("/zones?name=pvpspinarena.com");
assert.equal(zones.length, 1);
const routes = (await read(`/zones/${zones[0].id}/workers/routes`))
  .filter((route) => route.script === "pvpspinarena")
  .map((route) => ({ pattern: route.pattern, zone_name: "pvpspinarena.com" }));
assert(
  routes.some((route) => route.pattern === "pvpspinarena.com/*"),
  "Current production root route unavailable",
);
const currentVars = Object.fromEntries(
  settings.bindings
    .filter((binding) => binding.type === "plain_text")
    .map((binding) => [binding.name, binding.text]),
);
assert.equal(currentVars.SUPABASE_PROJECT_ID, ref);
const runtime = JSON.parse(fs.readFileSync("workers/fps/wrangler.jsonc", "utf8"));
runtime.account_id = account;
runtime.name = "pvpspinarena-fps";
runtime.main = path.resolve("workers/fps/index.ts");
runtime.workers_dev = true;
runtime.compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"];
runtime.hyperdrive = [{ binding: "HYPERDRIVE", id: "c8cfc572b3014d6da467d75faa305c1d" }];
runtime.vars = {
  ALLOWED_ORIGIN: "https://pvpspinarena.com",
  SUPABASE_URL: process.env.SUPABASE_URL,
  FPS_ROOM_REGION: "enam",
};
assert(
  runtime.durable_objects.bindings.every(
    (binding) => binding.class_name === "DuelRoom" && !binding.script_name && !binding.namespace_id,
  ),
  "Production must create its own empty runtime namespace",
);
const app = JSON.parse(fs.readFileSync(".output/server/wrangler.json", "utf8"));
app.account_id = account;
app.name = "pvpspinarena";
app.main = path.resolve(".output/server/index.mjs");
app.assets.directory = path.resolve(".output/public");
app.workers_dev = false;
app.routes = routes;
app.keep_vars = true;
app.compatibility_flags = [
  ...new Set([
    ...(app.compatibility_flags ?? []),
    "nodejs_compat",
    "nodejs_compat_populate_process_env",
    "global_fetch_strictly_public",
  ]),
];
app.limits = settings.limits;
app.observability = settings.observability;
app.vars = {
  ...currentVars,
  ...Object.fromEntries(
    [
      "SUPABASE_URL",
      "SUPABASE_PROJECT_ID",
      "SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PROJECT_ID",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "FPS_RUNTIME_ORIGIN",
    ].map((key) => [key, process.env[key]]),
  ),
};
const existingSchedules = Array.isArray(schedules) ? schedules : schedules.schedules;
assert(Array.isArray(existingSchedules), "Production cron inventory unavailable");
app.triggers = { crons: existingSchedules.map((schedule) => schedule.cron) };
const directory = path.resolve(".wrangler/fps-production-hosted");
fs.mkdirSync(directory, { recursive: true });
for (const [name, config] of [
  ["runtime", runtime],
  ["app", app],
]) {
  const text = JSON.stringify(config, null, 2);
  assert(
    !text.includes("rymzkgqoekjluzmzstap"),
    "Staging target found in production configuration",
  );
  fs.writeFileSync(path.join(directory, name + ".json"), text);
}
fs.writeFileSync(path.join(directory, "current-settings.private.json"), JSON.stringify(settings));
const report = {
  at: new Date().toISOString(),
  project: ref,
  runtimeName: runtime.name,
  appName: app.name,
  routes,
  preservedCronSchedules: app.triggers.crons,
  productionNamespaceIsNew: true,
  existingSecretNames: settings.bindings
    .filter((binding) => binding.type === "secret_text")
    .map((binding) => binding.name),
  originalPublicVarsSha256: createHash("sha256").update(JSON.stringify(currentVars)).digest("hex"),
  financialFlagsPreserved: Object.keys(currentVars)
    .filter((key) => !key.startsWith("FPS_"))
    .every((key) => app.vars[key] === currentVars[key] || key.startsWith("VITE_SUPABASE_")),
  deployed: false,
};
assert(report.financialFlagsPreserved, "An existing production flag would change");
fs.writeFileSync(
  "test-results/remediation-production-worker-plan.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    project: ref,
    routes: routes.length,
    preservedCronSchedules: app.triggers.crons,
    financialFlagsPreserved: report.financialFlagsPreserved,
    productionNamespaceIsNew: true,
    deployed: false,
  }),
);
