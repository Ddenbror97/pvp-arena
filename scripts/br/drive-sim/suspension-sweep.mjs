/**
 * Suspension and airtime sweep (Node, no browser): every drivable kind at 10, 20 and 30 m/s on
 * the island's roads, straight across open country and on the Iron Peaks, through the shared
 * `stepVehicle` (the server's and the driver's prediction). Reports per run: jumps a minute
 * (airborne and clear of the ground by more than 0.3 m), short hops, time in the air, the
 * jumps' heights, hard landings, how hard the body is jolted on the ground (RMS of the height's
 * and the pitch's second difference: lower is smoother), and the step's cost.
 *
 *   node scripts/br/drive-sim/suspension-sweep.mjs [--json=out.json] [--kinds=sedan,bike]
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sweep-")), "sweep.mjs");
await build({
  entryPoints: [path.join(ROOT, "scripts/br/drive-sim/suspension-entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: out,
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "error",
});
const run = spawnSync(process.execPath, [out], {
  env: { ...process.env, ROOT, KINDS: arg("kinds") ?? "sedan,suv,pickup,bike" },
  encoding: "utf8",
  maxBuffer: 64 << 20,
});
fs.rmSync(path.dirname(out), { recursive: true, force: true });
if (run.status !== 0) {
  process.stderr.write(run.stderr);
  process.exit(run.status ?? 1);
}
const result = JSON.parse(run.stdout.trim().split("\n").at(-1));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(result, null, 1));
console.table(result.report);
console.log("cost", result.cost);
console.log("occlusion", result.occlusion);
