/**
 * AWP review renders in headless Chromium (SwiftShader WebGL2) with three.js — see entry.ts.
 *
 *   node art/blender/awp/review/capture.mjs [--out=art/blender/awp/build/review]
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
const ROOT = path.resolve(HERE, "../../../..");
const outDir = path.resolve(ROOT, flag("out") ?? "art/blender/awp/build/review");
fs.mkdirSync(outDir, { recursive: true });

/** Runtime numbers (README "Node contract"); the rests are the game's weapon-group framings. */
const SPEC = {
  boltTravel: 0.198,
  handleLift: (65 * Math.PI) / 180,
  magDrop: 0.1,
  // Support hand on the fore-end: the AK handguard wrap opened slightly (fore-end half-width
  // 0.041 vs the AK's 0.038) and moved down onto the fore-end axis (rig Y −0.055 vs −0.011).
  guard: { scale: 0.82, shift: [0.004, -0.044, 0], twist: 1.2 },
  rests: {
    // The game's VIEWMODEL_REST (renderer.ts), shared by the AK and M4.
    ak: { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 },
    // A closer framing nearer the reference (scope large at the right): a suggestion only.
    alt: flag("rest")
      ? JSON.parse(flag("rest"))
      : { x: 0.13, y: -0.095, z: -0.1, pitch: 0.02, yaw: 0.06, roll: -0.06 },
  },
};

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
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
const browser = await launch(undefined).catch(() => launch(fallback));
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.review === "function");
const shots = await page.evaluate((spec) => window.review(spec), SPEC);
for (const [name, data] of Object.entries(shots))
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data.split(",")[1], "base64"));
console.log(`${Object.keys(shots).length} views → ${outDir}`, errors.length ? errors : "");
await browser.close();
server.close();
