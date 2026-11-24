/**
 * The performance lab: the island renderer and the real game client as two bundles that run on
 * any page of the deployed site, for measuring on real graphics hardware (production
 * performance audit, 2026-11-24).
 *
 *   node scripts/br/perf-lab/build.mjs <outDir>
 *
 *   world.js  the explorer (scripts/br/explorer/entry.ts: the island renderer with the game's
 *             settings, no players) plus `window.labWorld`: fixed views, pans and walks at
 *             fixed render sizes, every frame timed to the end of the GPU's work.
 *   game.js   the client check (scripts/br/client-sim/ui.tsx: the real client, br-arena.ts,
 *             with its React HUD, against the shared match run in the page) plus
 *             `window.labGame`: scripted play with every frame's interval, script time and
 *             GPU time recorded.
 *
 * Both load the island from `/fps/br/…` of whatever site the page is on. On the owner's
 * computer: open https://pvpspinarena.com/robots.txt (a page without a content policy), set
 * what the run needs on `window` (see lab.md), then import the bundle from a blob.
 *
 * What the bundles change in the game's own code, and nothing else:
 *  - the graphics tier can be forced (`window.__labTier`; quality-tier.ts otherwise decides);
 *  - the tactical map's worker comes from a blob (a bundle has no file beside it);
 *  - the deploy's fingerprint list is asked for when `window.__labHashes === true`.
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const outDir = path.resolve(process.argv[2] ?? "art/br/build/perf-lab");
fs.mkdirSync(outDir, { recursive: true });

const worker = (
  await build({
    entryPoints: [path.join(ROOT, "src/lib/fps/br/tactical-map.worker.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    minify: true,
    logLevel: "error",
  })
).outputFiles[0].text;

const swapIn = (src, a, b, what) => {
  if (!src.includes(a)) throw new Error(`${what} changed: ${a}`);
  return src.replace(a, b);
};
/** The three changes above, made as the game's files are read. */
const lab = {
  name: "perf-lab",
  setup(b) {
    b.onLoad({ filter: /src[\\/]lib[\\/]fps[\\/]br[\\/]quality-tier\.ts$/ }, (args) => ({
      loader: "ts",
      contents: swapIn(
        fs.readFileSync(args.path, "utf8"),
        "function detect(): BrTierInfo {",
        `function detect(): BrTierInfo {
  const forced = (globalThis as { __labTier?: BrTier }).__labTier;
  if (forced) return { tier: forced, reason: "lab", gpu: probeGpu(false).gpu, probeMs: null };`,
        "quality-tier.ts",
      ),
    }));
    // `__labFixedRes`: the adaptive resolution held at full scale (the tier's native size), to
    // measure a fixed resolution apart from the adaptive one. Whichever budget the tree has.
    const FIXED = "if ((globalThis as { __labFixedRes?: boolean }).__labFixedRes) return false;";
    b.onLoad({ filter: /src[\\/]lib[\\/]fps[\\/]presentation\.ts$/ }, (args) => ({
      loader: "ts",
      contents: swapIn(
        fs.readFileSync(args.path, "utf8"),
        "  update(ms: number) {",
        `  update(ms: number) {\n    ${FIXED}`,
        "presentation.ts",
      ),
    }));
    b.onLoad({ filter: /src[\\/]lib[\\/]fps[\\/]br[\\/]render-budget\.ts$/ }, (args) => ({
      loader: "ts",
      contents: swapIn(
        fs.readFileSync(args.path, "utf8"),
        "  update(ms: number, gpuMs: number | null): boolean {",
        `  update(ms: number, gpuMs: number | null): boolean {\n    ${FIXED}`,
        "render-budget.ts",
      ),
    }));
    b.onLoad({ filter: /src[\\/]lib[\\/]fps[\\/]br[\\/]tactical-map\.ts$/ }, (args) => ({
      loader: "ts",
      contents: swapIn(
        fs.readFileSync(args.path, "utf8"),
        'new URL("./tactical-map.worker.ts", import.meta.url)',
        `URL.createObjectURL(new Blob([${JSON.stringify(worker)}], { type: "text/javascript" }))`,
        "tactical-map.ts",
      ),
    }));
  },
};
const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  // LAB_MINIFY=0: readable function names (for CPU profiles).
  minify: process.env.LAB_MINIFY !== "0",
  jsx: "automatic",
  loader: { ".css": "text" },
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env.DEV": "false",
    __BR_ASSET_HASHES__: "globalThis.__labHashes",
  },
  alias: { "@": path.join(ROOT, "src") },
  plugins: [lab],
  // The package is marked free of side effects; the harness's imports are all side effects.
  ignoreAnnotations: true,
  logLevel: "error",
};

// world.js: the explorer's own entry with a fixed render size and the bench appended (the
// bench reads the entry's locals, as scripts/br/gpu-bench does).
let world = fs.readFileSync(path.join(ROOT, "scripts/br/explorer/entry.ts"), "utf8");
world = world.replaceAll('"../../../src/', '"@/');
world = swapIn(
  world,
  "function resize() {",
  "let benchSize: [number, number] | null = null;\nfunction resize() {",
  "explorer entry",
);
world = swapIn(
  world,
  "const w = innerWidth,\n    h = innerHeight;",
  "const w = benchSize?.[0] ?? innerWidth,\n    h = benchSize?.[1] ?? innerHeight;",
  "explorer entry",
);
// The tier as the page says (the lab sets it before the import), not the query alone.
world = swapIn(
  world,
  'const tierParam = new URLSearchParams(location.search).get("tier");',
  'const tierParam = (globalThis as { __labTier?: string }).__labTier ?? new URLSearchParams(location.search).get("tier");',
  "explorer entry",
);
world += "\n" + fs.readFileSync(path.join(HERE, "world-bench.part.ts"), "utf8");
const tmp = path.join(HERE, ".world.generated.ts");
fs.writeFileSync(tmp, world);
try {
  await build({ ...common, entryPoints: [tmp], outfile: path.join(outDir, "world.js") });
} finally {
  fs.rmSync(tmp);
}
await build({
  ...common,
  entryPoints: [path.join(HERE, "game.tsx")],
  outfile: path.join(outDir, "game.js"),
});
for (const f of ["world.js", "game.js"])
  console.log(
    `${path.join(outDir, f)}: ${(fs.statSync(path.join(outDir, f)).size / 1048576).toFixed(2)} MB`,
  );
