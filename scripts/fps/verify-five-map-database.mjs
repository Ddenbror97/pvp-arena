import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { build } from "esbuild";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const b = await build({
  entryPoints: ["src/lib/fps/maps/registry.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { MAP_IDS } = await import(
  "data:text/javascript;base64," + Buffer.from(b.outputFiles[0].text).toString("base64")
);
const selected = process.argv.find((a) => a.startsWith("--map="))?.slice(6);
if (selected && !MAP_IDS.includes(selected)) throw Error("Unknown map");
const rows = [];
for (const id of selected ? [selected] : MAP_IDS) {
  console.log("Testing isolated database/runtime map " + id);
  const r = spawnSync(process.execPath, ["scripts/fps/verify-staging-runtime.mjs", "--map=" + id], {
    env: process.env,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  fs.writeFileSync("test-results/fps-database-" + id + ".log", (r.stdout ?? "") + (r.stderr ?? ""));
  const path = "test-results/fps-staging-runtime-" + id + ".json";
  const result = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : null;
  rows.push({
    id,
    exitCode: r.status,
    passed: r.status === 0 && result?.passed === true,
    checks: result?.checks,
    error: result?.failure ?? r.error?.message,
  });
  console.log(JSON.stringify(rows.at(-1)));
  if (r.status !== 0) break;
}
const report = {
  project: process.env.SUPABASE_PROJECT_ID,
  at: new Date().toISOString(),
  rows,
  passed: rows.length === (selected ? 1 : MAP_IDS.length) && rows.every((x) => x.passed),
};
fs.writeFileSync("test-results/fps-five-map-database.json", JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
