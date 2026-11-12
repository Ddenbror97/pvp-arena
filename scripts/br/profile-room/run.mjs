/**
 * node [--cpu-prof --cpu-prof-dir=<dir>] scripts/br/profile-room/run.mjs [--minutes=8] [--seed=11]
 * [--viewers=100]: per-tick cost of a 100-seat room on the real engine (entry.ts).
 */
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const arg = (n, d) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d);
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "br-profile-")), "profile.mjs");
await build({
  entryPoints: [path.join(ROOT, "scripts/br/profile-room/entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: out,
  sourcemap: "inline",
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "error",
});
process.chdir(ROOT);
const { profile } = await import(pathToFileURL(out).href);
const r = await profile(arg("minutes", 8), arg("seed", 11), arg("viewers", 100));
const { windows, ...sum } = r;
console.log(JSON.stringify(sum));
console.table(windows);
