import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(".output/server/wrangler.json");
const cfg = JSON.parse(readFileSync(path, "utf8"));
cfg.name = "pvpspinarena";
cfg.workers_dev = false;
cfg.triggers = { crons: ["* * * * *"] };
cfg.routes = [
  { pattern: "pvpspinarena.com/*", zone_name: "pvpspinarena.com" },
  { pattern: "www.pvpspinarena.com/*", zone_name: "pvpspinarena.com" },
];
cfg.vars = {
  ...(cfg.vars ?? {}),
  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID ?? "",
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID ?? "",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
};
const flags = Array.isArray(cfg.compatibility_flags) ? cfg.compatibility_flags : [];
if (!flags.includes("nodejs_compat")) flags.push("nodejs_compat");
if (!flags.includes("nodejs_compat_populate_process_env")) flags.push("nodejs_compat_populate_process_env");
cfg.compatibility_flags = flags;
writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log("Patched", path, "name=", cfg.name);

const ssrDir = resolve(".output/server/_ssr");
const ssrFiles = readdirSync(ssrDir);
const jobsFile = ssrFiles.find((f) => f.startsWith("jobs.server-") && f.endsWith(".mjs"));
const indexPath = resolve(".output/server/index.mjs");
let index = readFileSync(indexPath, "utf8");
if (jobsFile && !index.includes("runScheduledCryptoJobs")) {
  const needle = `scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		}`;
  const insert = `scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil((async () => {
				await (nitroHooks.callHook("cloudflare:scheduled", { controller, env, context }) || Promise.resolve());
				const { applyWorkerEnv, runScheduledCryptoJobs } = await import("./_ssr/${jobsFile}");
				applyWorkerEnv(env);
				await runScheduledCryptoJobs();
			})());
		}`;
  if (!index.includes(needle)) {
    console.error("Could not patch Worker scheduled handler; needle missing");
    process.exit(1);
  }
  writeFileSync(indexPath, index.replace(needle, insert));
  console.log("Patched scheduled handler via", jobsFile);
}
