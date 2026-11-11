import { build } from "esbuild";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname);
// `node run.mjs` measures the room tick; `node run.mjs balance` runs bot-only balance matches.
const entry = process.argv[2] === "balance" ? "balance.ts" : "room.ts";
const out = path.join(HERE, `.${entry.replace(".ts", "")}.mjs`);
await build({
  entryPoints: [path.join(HERE, entry)],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "error",
});
try {
  await import(out);
} finally {
  fs.rmSync(out, { force: true });
}
