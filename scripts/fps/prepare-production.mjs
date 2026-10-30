import fs from "node:fs";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";

// Read-only preparation. Does not deploy, migrate, seed users or alter settings.
const ref = "dkyabirifoixnfbmheay",
  url = `https://${ref}.supabase.co`;
const authorized = new URL(process.env.FPS_PRODUCTION_DATABASE_URL ?? "");
assert(
  authorized.hostname === `db.${ref}.supabase.co` ||
    decodeURIComponent(authorized.username) === `postgres.${ref}`,
  "An explicitly authorized production connection is required",
);
const inventory = JSON.parse(
  fs.readFileSync(".wrangler/production-rollback-artifact/settings.private.json", "utf8"),
);
const publishable = inventory.bindings.find(
  (b) => b.name === "SUPABASE_PUBLISHABLE_KEY" && b.type === "plain_text",
)?.text;
assert(publishable, "Current production publishable key is unavailable");
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
  headers: { Authorization: "Bearer " + process.env.SUPABASE_ACCESS_TOKEN },
});
if (!response.ok) throw Error("Production key lookup HTTP " + response.status);
const keys = await response.json();
const service = keys.find((k) => k.name === "service_role" && k.type === "legacy")?.api_key;
assert(service, "Production service key was not returned");
const publicCheck = await fetch(url + "/rest/v1/profiles?select=id&limit=1", {
  headers: { apikey: publishable },
});
assert.equal(publicCheck.status, 200, "Production public connectivity failed");
await publicCheck.arrayBuffer();
const privateCheck = await fetch(url + "/auth/v1/admin/users?page=1&per_page=1", {
  headers: { apikey: service, Authorization: "Bearer " + service },
});
assert.equal(privateCheck.status, 200, "Production service credential verification failed");
await privateCheck.arrayBuffer();
const file = ".env.fps-production";
let runtimeSecret;
if (fs.existsSync(file))
  runtimeSecret = /^FPS_RUNTIME_SECRET="([^"]+)"/m.exec(fs.readFileSync(file, "utf8"))?.[1];
runtimeSecret ??= randomBytes(32).toString("hex");
assert(
  runtimeSecret !== process.env.FPS_RUNTIME_SECRET,
  "Production runtime key must be distinct from staging",
);
const env = {
  SUPABASE_PROJECT_ID: ref,
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SERVICE_ROLE_KEY: service,
  VITE_SUPABASE_PROJECT_ID: ref,
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: publishable,
  FPS_RUNTIME_SECRET: runtimeSecret,
  FPS_RUNTIME_ORIGIN: "https://pvpspinarena-fps.pvpspinarena.workers.dev",
};
fs.writeFileSync(
  file,
  Object.entries(env)
    .map(([key, value]) => key + "=" + JSON.stringify(value))
    .join("\n") + "\n",
);
const report = {
  at: new Date().toISOString(),
  project: ref,
  publicConnectivity: publicCheck.status,
  serviceCredentialVerification: privateCheck.status,
  productionRuntimeKeySeparate: true,
  existingProductionSecretNames: inventory.bindings
    .filter((b) => b.type === "secret_text")
    .map((b) => b.name),
  financialSettingsChanged: false,
  limitations:
    "Existing third-party payment credentials were inventoried only; no deposits, payouts or payment operations were exercised.",
};
fs.writeFileSync(
  "test-results/remediation-production-preparation.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    project: ref,
    publicConnectivity: publicCheck.status,
    serviceCredentialVerification: privateCheck.status,
    productionRuntimeKeySeparate: true,
    financialSettingsChanged: false,
  }),
);
