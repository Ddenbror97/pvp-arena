/** node scripts/br/map-audit/run.mjs <script name without .ts> [args…] — bundles and runs a map-audit script. */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const [name, ...rest] = process.argv.slice(2);
const out = path.join(ROOT, "node_modules/.cache/map-audit", `${name}.mjs`);
await build({
  entryPoints: [path.join(ROOT, "scripts/br/map-audit", `${name}.ts`)],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: out,
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "error",
  packages: "external",
});
process.argv = [process.argv[0], out, ...rest];
await import(pathToFileURL(out).href);
