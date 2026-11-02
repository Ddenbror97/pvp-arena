// Run the existing TypeScript audit with the declared build tool; Bun is not required.
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const outfile = fileURLToPath(new URL("../.wrangler/guide-check/check.mjs", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/check-guides.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
});
await import(pathToFileURL(outfile).href);
