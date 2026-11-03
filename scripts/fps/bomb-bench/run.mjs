import { build } from "esbuild";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(HERE, ".room.mjs");
await build({
  entryPoints: [path.join(HERE, "room.ts")],
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
