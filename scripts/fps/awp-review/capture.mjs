/**
 * AWP runtime review renders (scripts/fps/awp-review/entry.ts) — copy of the asset review harness
 * (art/blender/awp/review/capture.mjs) driving the game's own viewmodel code:
 *
 *   node scripts/fps/awp-review/capture.mjs [--only=police] [--out=dir]
 *
 * Original header: AWP review renders in headless Chromium (SwiftShader WebGL2) with three.js — see entry.ts.
 *
 *   node art/blender/awp/review/capture.mjs [--out=art/blender/awp/build/runtime-review]
 *
 * Serves public/ (the merged public/fps/models/awp-*.glb and the shipped AK for the overlay)
 * and writes one PNG per view. The part motions use the numbers in art/blender/awp/README.md.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const outDir = path.resolve(ROOT, flag("out") ?? "art/blender/awp/build/runtime-review");
fs.mkdirSync(outDir, { recursive: true });

const T = (team) => [
  { name: `${team}-rest`, team, kind: "rest" },
  { name: `${team}-shot-60`, team, kind: "bolt", ms: 60, kick: 0.8 },
  { name: `${team}-bolt-300-hand`, team, kind: "bolt", ms: 300 },
  { name: `${team}-bolt-470-lift`, team, kind: "bolt", ms: 470 },
  { name: `${team}-bolt-650-back`, team, kind: "bolt", ms: 650 },
  { name: `${team}-bolt-930-lower`, team, kind: "bolt", ms: 930 },
  { name: `${team}-bolt-1150-return`, team, kind: "bolt", ms: 1150 },
  { name: `${team}-tac-500`, team, kind: "tactical", ms: 500 },
  { name: `${team}-tac-900`, team, kind: "tactical", ms: 900 },
  { name: `${team}-tac-2200`, team, kind: "tactical", ms: 2200 },
  { name: `${team}-tac-3000`, team, kind: "tactical", ms: 3000 },
  { name: `${team}-empty-1200`, team, kind: "empty", ms: 1200 },
  { name: `${team}-empty-2600`, team, kind: "empty", ms: 2600 },
];
const views = (team) =>
  ["side", "rear"].flatMap((view) => [
    { name: `${team}-${view}-rest`, team, kind: "rest", view },
    { name: `${team}-${view}-bolt-470`, team, kind: "bolt", ms: 470, view },
    { name: `${team}-${view}-bolt-650`, team, kind: "bolt", ms: 650, view },
    { name: `${team}-${view}-tac-900`, team, kind: "tactical", ms: 900, view },
    { name: `${team}-${view}-tac-2200`, team, kind: "tactical", ms: 2200, view },
  ]);
const only = flag("only");
const SHOTS = [...T("police"), ...T("terrorist"), ...views("police")].filter(
  (s) => !only || s.name.includes(only),
);
const bundle = await build({
  entryPoints: [path.join(HERE, "entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  logLevel: "error",
  nodePaths: [path.join(ROOT, "node_modules")],
});
const js = bundle.outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0'><script type=module src='/review.js'></script></body></html>",
    );
  if (url === "/review.js")
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
const fallback = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const launch = (executablePath) =>
  chromium.launch({
    executablePath,
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--no-sandbox",
    ],
  });
const browser = await launch(undefined).catch(() => launch(fallback));
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.review === "function");
const shots = await page.evaluate(([list, size]) => window.review(list, size), [SHOTS, [960, 540]]);
for (const [name, data] of Object.entries(shots))
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data.split(",")[1], "base64"));
console.log(`${Object.keys(shots).length} views → ${outDir}`, errors.length ? errors : "");
await browser.close();
server.close();
