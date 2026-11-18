// Bundle and run the guide hub audit (scripts/audit-guide-hub.ts) with the declared build tool.
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const outfile = fileURLToPath(new URL("../.wrangler/guide-audit/audit.mjs", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/audit-guide-hub.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  alias: { "@": root + "src" },
});
await import(pathToFileURL(outfile).href);
