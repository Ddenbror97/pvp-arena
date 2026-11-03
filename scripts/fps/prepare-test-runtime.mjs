import fs from "node:fs";
import path from "node:path";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const c = JSON.parse(fs.readFileSync("workers/fps/wrangler.jsonc", "utf8"));
c.name = "fps-isolated-validation";
// Match the integration harness and installed local workerd; production config is untouched.
c.compatibility_date = "2026-10-26";
c.main = path.resolve("workers/fps/index.ts");
c.workers_dev = false;
delete c.account_id;
delete c.routes;
delete c.hyperdrive;
c.compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"];
c.vars = {
  ALLOWED_ORIGIN: "http://127.0.0.1:4180",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  FPS_RUNTIME_SECRET: process.env.FPS_RUNTIME_SECRET,
};
for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "FPS_RUNTIME_SECRET"])
  if (!c.vars[key]) throw Error("Missing staging " + key);
fs.mkdirSync(".wrangler/fps-db-test", { recursive: true });
const secretVars = ["SUPABASE_SERVICE_ROLE_KEY", "FPS_RUNTIME_SECRET"]
  .map((key) => `${key}=${c.vars[key]}`)
  .join("\n");
for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "FPS_RUNTIME_SECRET"]) delete c.vars[key];
fs.writeFileSync(".wrangler/fps-db-test/.dev.vars", secretVars + "\n");
fs.writeFileSync(".wrangler/fps-db-test/runtime.private.json", JSON.stringify(c, null, 2));
console.log(
  "Prepared local-only staging runtime config in ignored .wrangler directory. Do not deploy it.",
);
