/**
 * SANDGATE review renders and collision-dressing check in headless Chromium (SwiftShader WebGL2),
 * with the game's own map loader and the bomb renderer's lighting (see entry.ts).
 *
 *   node art/blender/map06/review/capture.mjs [--views=a,b] [--check] [--out=art/blender/map06/build/review]
 *
 * Writes <out>/<view>.png and <out>/stats.json; with --check also art/blender/map06/build/check.json
 * (exit code 1 when a solid is under-dressed or a visual intrudes into walkable space).
 * Serves public/ (the shipped public/fps/models/sandgate.glb).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const flag = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}`))?.split("=")[1] ??
  (process.argv.includes(`--${name}`) ? true : undefined);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const outDir = path.resolve(ROOT, flag("out") ?? "art/blender/map06/build/review");
// --map=iron-district renders the other bomb map from views-iron-district.json (no check, no perf).
const MAP = typeof flag("map") === "string" ? flag("map") : "sandgate";
const VIEWS = JSON.parse(
  fs.readFileSync(path.join(HERE, MAP === "sandgate" ? "views.json" : `views-${MAP}.json`), "utf8"),
);
const only = typeof flag("views") === "string" ? flag("views").split(",") : null;
const views = Object.fromEntries(Object.entries(VIEWS).filter(([k]) => !only || only.includes(k)));
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({
  entryPoints: [path.join(HERE, "entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  loader: { ".webp": "empty", ".png": "empty" },
  logLevel: "error",
});
const js = bundle.outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      `<!doctype html><html><body style='margin:0'><script>window.__REVIEW_MAP=${JSON.stringify(MAP)}</script><script type=module src='/capture.js'></script></body></html>`,
    );
  if (url === "/capture.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": file.endsWith(".glb") ? "model/gltf-binary" : "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
// Chromium: Playwright's own, else --chromium=/path or CHROMIUM, else any build under /opt/pw-browsers.
const exe =
  (typeof flag("chromium") === "string" && flag("chromium")) ||
  process.env.CHROMIUM ||
  (() => {
    const base = "/opt/pw-browsers";
    if (!fs.existsSync(base)) return undefined;
    for (const d of fs
      .readdirSync(base)
      .filter((d) => d.startsWith("chromium_headless_shell-"))
      .sort()
      .reverse())
      for (const sub of fs.readdirSync(path.join(base, d))) {
        const p = path.join(base, d, sub, "chrome-headless-shell");
        if (fs.existsSync(p)) return p;
      }
    return undefined;
  })();
const browser = await chromium.launch({
  executablePath: exe,
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.capture === "function");
let failed = false;
const [w, h] = [1280, 720];
if (Object.keys(views).length) {
  const result = await page.evaluate(([v, w, h]) => window.capture(v, w, h), [views, w, h]);
  const stats = {
    loadMs: result.loadMs,
    meshes: result.meshes,
    shadowCasters: result.shadowCasters,
    geometries: result.geometries,
    textures: result.textures,
    programs: result.programs,
    views: {},
  };
  for (const [name, v] of Object.entries(result.views)) {
    fs.writeFileSync(
      path.join(outDir, `${name}.png`),
      Buffer.from(v.image.split(",")[1], "base64"),
    );
    stats.views[name] = { calls: v.calls, triangles: v.triangles, ms: v.ms };
  }
  fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats, null, 1));
  // Merge the in-engine numbers into build/perf.json (written by measure_glb.mjs in build.sh).
  const perfFile = path.join(ROOT, "art/blender/map06/build/perf.json");
  if (fs.existsSync(perfFile) && !only && MAP === "sandgate") {
    const perf = JSON.parse(fs.readFileSync(perfFile, "utf8"));
    perf["sandgate.glb (in engine, SwiftShader)"] = stats;
    fs.writeFileSync(perfFile, JSON.stringify(perf, null, 1));
  }
  console.log(JSON.stringify(stats));
}
if (flag("check")) {
  const layout = JSON.parse(
    fs.readFileSync(path.join(ROOT, "art/blender/map06/build/layout.json"), "utf8"),
  );
  const r = await page.evaluate((l) => window.check(l), layout);
  const under = Object.entries(r.coverage)
    .filter(([, c]) => c.samples > 0)
    .map(([id, c]) => ({
      id,
      kind: c.kind,
      ratio: +(c.covered / c.samples).toFixed(3),
      samples: c.samples,
    }))
    .sort((a, b) => a.ratio - b.ratio);
  // Thresholds: walls and blocks must be fully dressed; vehicles, the forklift and the open gate
  // frames are dressed by models with gaps (wheel arches, the forklift cage), so a lower floor.
  // Architecture, vehicles and the forklift (whose boxes hug their models) must be fully
  // dressed; prop models with rounded edges (crates, sandbags, HESCO) a little less. The reverse
  // direction for vehicles (empty collision) is in check.json "vehicles".
  // Vehicles and the forklift: rounded models in axis-aligned boxes. Their face coverage is
  // reported (check.json underDressed / coverageByKind) but gated lower; what is gated instead is
  // the reverse direction (emptyCollision per vehicle, below) and zero intrusions.
  const floor = (k) =>
    ({
      vehicle: 0.55,
      forklift: 0.6,
      crate: 0.88,
      "crate-stack": 0.88,
      sandbags: 0.88,
      "sand-barrier": 0.88,
      "blast-wall": 0.88,
      // Street-life props (props.py): rounded or open models (cars, palm trunks, the handcart's
      // rails, the stall's counter of crates) enclosed by boxes; the gate that matters for them is
      // zero intrusions.
      "prop-car": 0.25,
      "prop-palm": 0.4,
      "prop-stall": 0.2,
      "prop-cart": 0.15,
      "prop-pot": 0.6,
      "prop-tires": 0.6,
      "prop-rubble": 0.4,
      "prop-bag": 0.4,
      "prop-bush": 0.3,
    })[k] ?? 0.95;
  const bad = under.filter((u) => u.ratio < floor(u.kind));
  const intr = Object.entries(r.intrusions).sort((a, b) => b[1] - a[1]);
  const report = {
    triangles: r.triangles,
    samplesTested: r.tested,
    solids: under.length,
    minCoverage: under[0],
    underDressed: bad,
    coverageByKind: Object.fromEntries(
      [...new Set(under.map((u) => u.kind))].map((k) => {
        const g = under.filter((u) => u.kind === k);
        return [k, { solids: g.length, minRatio: Math.min(...g.map((u) => u.ratio)) }];
      }),
    ),
    vehicles: r.vehicles,
    intrusionCells: intr.length,
    intrusions: intr.slice(0, 40),
    examples: r.examples,
    pageErrors: errors,
    pass:
      bad.length === 0 &&
      intr.length === 0 &&
      Object.values(r.vehicles ?? {}).every((v) => v.emptyCollision <= 0.25),
  };
  fs.writeFileSync(
    path.join(ROOT, "art/blender/map06/build/check.json"),
    JSON.stringify(report, null, 1),
  );
  console.log(
    JSON.stringify({
      pass: report.pass,
      underDressed: bad.length,
      vehicles: r.vehicles,
      intrusionCells: intr.length,
      minCoverage: report.minCoverage,
    }),
  );
  failed = !report.pass;
}
if (errors.length) console.error(errors.join("\n"));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
