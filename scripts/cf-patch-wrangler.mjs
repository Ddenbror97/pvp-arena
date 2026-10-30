import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function readDotEnv(filePath) {
  const out = {};
  if (!existsSync(filePath)) return out;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

// An empty shell variable must not win. `node --env-file` leaves existing
// empty values in place, and writing those into wrangler.json blanks the Worker.
function envValue(name, file) {
  const fromProcess = process.env[name];
  if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;
  return file[name] ?? "";
}

function requireEnv(name, file) {
  const value = envValue(name, file);
  if (!value) {
    console.error(
      `Refusing to patch Worker config: ${name} is empty. An empty shell variable must not overwrite .env.`,
    );
    process.exit(1);
  }
  return value;
}

const dotenv = readDotEnv(resolve(".env"));
const supabaseUrl = requireEnv("SUPABASE_URL", dotenv);
const supabaseProjectId = requireEnv("SUPABASE_PROJECT_ID", dotenv);
const supabasePublishableKey = requireEnv("SUPABASE_PUBLISHABLE_KEY", dotenv);

const path = resolve(".output/server/wrangler.json");
const cfg = JSON.parse(readFileSync(path, "utf8"));
cfg.name = "pvpspinarena";
cfg.workers_dev = false;
cfg.triggers = { crons: ["* * * * *"] };
// Workers Paid: explicit CPU ceiling (free plans reject `limits`) and Workers Logs.
cfg.limits = { cpu_ms: 30000 };
cfg.observability = { enabled: true, head_sampling_rate: 1 };
cfg.routes = [
  { pattern: "pvpspinarena.com/*", zone_name: "pvpspinarena.com" },
  { pattern: "www.pvpspinarena.com/*", zone_name: "pvpspinarena.com" },
];
cfg.vars = {
  ...(cfg.vars ?? {}),
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PROJECT_ID: supabaseProjectId,
  SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  VITE_SUPABASE_URL: envValue("VITE_SUPABASE_URL", dotenv) || supabaseUrl,
  VITE_SUPABASE_PROJECT_ID: envValue("VITE_SUPABASE_PROJECT_ID", dotenv) || supabaseProjectId,
  VITE_SUPABASE_PUBLISHABLE_KEY:
    envValue("VITE_SUPABASE_PUBLISHABLE_KEY", dotenv) || supabasePublishableKey,
  BTCPAY_MIN_DEPOSIT_CENTS: envValue("BTCPAY_MIN_DEPOSIT_CENTS", dotenv) || "200",
  // Exact string "true" turns on the five-game PVP1 signup invite.
  GAME_SIGNUP_PROMO_ENABLED: "true",
};
console.log(
  "Supabase Worker vars restored",
  `url=${supabaseUrl.length}`,
  `project=${supabaseProjectId.length}`,
  `publishable=${supabasePublishableKey.length}`,
);
const flags = Array.isArray(cfg.compatibility_flags) ? cfg.compatibility_flags : [];
if (!flags.includes("nodejs_compat")) flags.push("nodejs_compat");
if (!flags.includes("nodejs_compat_populate_process_env"))
  flags.push("nodejs_compat_populate_process_env");
// The casino calls the separate FPS Worker on the same Cloudflare account.
if (!flags.includes("global_fetch_strictly_public")) flags.push("global_fetch_strictly_public");
cfg.compatibility_flags = flags;
writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log("Patched", path, "name=", cfg.name);

// Guide JSON keeps a stable URL. Browsers must revalidate so a deploy cannot
// keep yesterday's article. Hashed /assets/* stay immutable.
const headersPath = resolve(".output/public/_headers");
let headers = existsSync(headersPath) ? readFileSync(headersPath, "utf8") : "";
if (!headers.includes("/guide-bodies/*")) {
  if (headers.length > 0 && !headers.endsWith("\n")) headers += "\n";
  headers += "/guide-bodies/*\n  Cache-Control: public, max-age=0, must-revalidate\n";
  writeFileSync(headersPath, headers);
  console.log("Patched", headersPath, "guide-bodies revalidate");
}

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
