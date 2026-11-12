/** node scripts/fps/bot-motion/run.mjs [--map=sandgate|iron-district] [--rounds=6] [--seed=0.37] */
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bot-motion-")), "m.mjs");
await build({
  entryPoints: [path.join(ROOT, "scripts/fps/bot-motion/entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: out,
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "error",
});
const { measure } = await import(pathToFileURL(out).href);
const maps = arg("map") ? [arg("map")] : ["sandgate", "iron-district"];
for (const m of maps)
  console.log(JSON.stringify(measure(m, Number(arg("rounds", 6)), Number(arg("seed", 0.37)))));
