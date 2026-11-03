/**
 * Render the first-person grenades on the team arms from the gameplay camera and the inspection
 * cameras (art/blender/grenades CAMERAS) in headless Chromium (SwiftShader).
 *   node scripts/fps/grenade-capture/capture.mjs <ak|m4> <outDir> <shots.json|--sequence=...> [--size=960x540]
 * shots.json: [{ "name": "he-ready", "view": { "kind": "ready", "type": "he", "t": 0.5, "move": 0 },
 *   "camera": "A" }]
 * --sequence=<type>,<clips>,<cameras>: every 1/30 s of equip, pin pull + wind-up and a throw,
 *   e.g. --sequence=he,over,AB (numbered frames for ffmpeg).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const [variant, outDir, shotsFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const [w, h] = (flag("size") ?? "960x540").split("x").map(Number);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
let shots;
if (flag("sequence")) {
  const [type, kind, cameras] = flag("sequence").split(",");
  shots = [];
  for (const camera of cameras.split("")) {
    let i = 0;
    const push = (view) =>
      shots.push({
        name: `seq-${type}-${kind}-${camera}-${String(i++).padStart(3, "0")}`,
        view,
        camera,
      });
    for (let t = 0; t <= 0.45; t += 1 / 30) push({ kind: "equip", type, t });
    for (let t = 0; t <= 0.3; t += 1 / 30) push({ kind: "ready", type, t, move: 0 });
    for (let t = 0; t <= 0.8; t += 1 / 30) push({ kind: "hold", type, t, throw: kind });
    for (let t = 0; t <= 0.52; t += 1 / 30)
      push({ kind: "throw", type, t, throw: kind, air: false });
  }
} else if (flag("lifecycle") || flag("world") || process.argv.includes("--programs")) shots = [];
else shots = JSON.parse(fs.readFileSync(shotsFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({
  entryPoints: [path.join(ROOT, "scripts/fps/grenade-capture/entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  loader: { ".webp": "dataurl", ".png": "dataurl", ".jpg": "dataurl" },
  logLevel: "error",
});
const js = bundle.outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0'><script type=module src='/c.js'></script></body></html>",
    );
  if (url === "/c.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": file.endsWith(".glb")
      ? "model/gltf-binary"
      : file.endsWith(".webp")
        ? "image/webp"
        : "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: flag("chromium"),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage();
page.on(
  "console",
  (m) => (m.type() === "error" || m.type() === "warning") && console.error("page:", m.text()),
);
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.grenadeCapture === "function");
if (flag("world")) {
  const plan = JSON.parse(fs.readFileSync(flag("world"), "utf8"));
  const result = await page.evaluate(
    ([p, ww, hh]) => window.grenadeWorldCapture(p, ww, hh),
    [plan, w, h],
  );
  const stats = {};
  for (const [name, r] of Object.entries(result)) {
    if (name.startsWith("_")) {
      stats[name] = r;
      continue;
    }
    fs.writeFileSync(
      path.join(outDir, `${name}.jpg`),
      Buffer.from(r.image.split(",")[1], "base64"),
    );
    stats[name] = { calls: r.calls, world: r.world };
  }
  fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats, null, 1));
  console.log(JSON.stringify(stats));
  await browser.close();
  server.close();
  process.exit(0);
}
if (process.argv.includes("--programs")) {
  console.log(JSON.stringify(await page.evaluate(() => window.grenadePrograms()), null, 1));
  await browser.close();
  server.close();
  process.exit(0);
}
if (flag("lifecycle")) {
  const result = await page.evaluate((n) => window.grenadeLifecycle(n), Number(flag("lifecycle")));
  fs.writeFileSync(path.join(outDir, "lifecycle.json"), JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result));
  await browser.close();
  server.close();
  process.exit(0);
}
const stats = {};
// Batches keep each evaluate's returned images bounded.
for (let i = 0; i < shots.length; i += 24) {
  const result = await page.evaluate(
    ([v, s, ww, hh]) => window.grenadeCapture(v, s, ww, hh),
    [variant, shots.slice(i, i + 24), w, h],
  );
  for (const [name, r] of Object.entries(result)) {
    if (name.startsWith("_")) {
      stats[name] = r;
      continue;
    }
    fs.writeFileSync(
      path.join(outDir, `${name}.jpg`),
      Buffer.from(r.image.split(",")[1], "base64"),
    );
    stats[name] = { calls: r.calls, triangles: r.triangles, grenade: r.grenade };
  }
}
fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(stats).slice(0, 6))));
await browser.close();
server.close();
