// Bundle and run a guide audit with the declared build tool:
//   node scripts/audit-guide-hub.mjs          the hub audit (scripts/audit-guide-hub.ts)
//   node scripts/audit-guide-hub.mjs eeat     the E-E-A-T audit (scripts/audit-guide-eeat.ts)
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const which = process.argv[2] === "eeat" ? "eeat" : "hub";
const outfile = fileURLToPath(new URL(`../.wrangler/guide-audit/${which}.mjs`, import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: [`scripts/audit-guide-${which}.ts`],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  alias: { "@": root + "src" },
});
await import(pathToFileURL(outfile).href);
