/**
 * node scripts/br/bot-sim/run.mjs [seed,seed…] [--minutes=40] — bot-only matches on the real
 * match engine (entry.ts), one JSON line each, then a summary across them.
 */
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const seeds = (process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "11,22,33")
  .split(",")
  .map(Number);
const minutes = Number(process.argv.find((a) => a.startsWith("--minutes="))?.slice(10) ?? 40);
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bot-sim-")), "sim.mjs");
await build({
  entryPoints: [path.join(ROOT, "scripts/br/bot-sim/entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: out,
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "error",
});
process.chdir(ROOT);
const { simulate } = await import(pathToFileURL(out).href);
const results = await simulate(seeds, minutes);
const sum = {};
for (const r of results)
  for (const [t, v] of Object.entries(r.byTier)) {
    const s = (sum[t] ??= { matches: 0, place: 0, kills: 0, wins: 0, top10: 0, n: 0 });
    s.matches++;
    s.place += v.place;
    s.kills += v.kills;
    s.wins += v.wins;
    s.top10 += v.top10;
    s.n += v.n;
  }
for (const s of Object.values(sum)) {
  s.place = Math.round((s.place / s.matches) * 10) / 10;
  s.kills = Math.round((s.kills / s.matches) * 100) / 100;
  s.top10Share = Math.round((s.top10 / s.n) * 1000) / 10;
}
const deaths = {};
for (const r of results)
  for (const [k, v] of Object.entries(r.deaths)) deaths[k] = (deaths[k] ?? 0) + v;
console.log(
  "SUMMARY",
  JSON.stringify({
    matches: results.length,
    minutes: results.map((r) => r.minutes),
    deaths,
    accuracy: results.map((r) => r.accuracy),
    stuck: results.map((r) => r.stuck),
    nades: results.map((r) => r.nades),
    tickP99: results.map((r) => r.tickP99),
    byTier: sum,
  }),
);
