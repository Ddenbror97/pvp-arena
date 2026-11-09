/**
 * Render the first-person C4 plant from the gameplay camera and the inspection cameras in
 * headless Chromium (SwiftShader).
 *   node scripts/fps/c4-capture/capture.mjs <ak|m4> <outDir> <shots.json|--sequence> [--chromium=/path] [--size=960x540]
 * shots.json: [{ "name": "a-press", "t": 1.0, "camera": "A" }, { "name": "cancel", "t": 1.4,
 * "exit": { "kind": "cancel", "since": 0.15 }, "camera": "A" }]
 * --sequence=A,B: every 1/30 s of the plant from each camera, numbered frames for ffmpeg.
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
  shots = [];
  for (const camera of flag("sequence").split(","))
    for (let i = 0; i <= 3.2 * 30; i++)
      shots.push({ name: `seq-${camera}-${String(i).padStart(3, "0")}`, t: i / 30, camera });
} else if (flag("defuse-sequence")) {
  // --defuse-sequence=<total s>,<distance m>,<bearing deg>,<cameras>: the defuse every 1/15 s,
  // then the completion.
  const [total, distance, bearing, cameras] = flag("defuse-sequence").split(",");
  shots = [];
  for (const camera of cameras.split(""))
    for (let i = 0; i <= Number(total) * 15 + 9; i++) {
      const t = i / 15;
      const exit = t > Number(total) ? { kind: "defused", since: t - Number(total) } : undefined;
      shots.push({
        name: `def-${camera}-${String(i).padStart(3, "0")}`,
        t: Math.min(t, Number(total)),
        camera,
        defuse: {
          total: Number(total),
          distance: Number(distance),
          bearing: Number(bearing),
          ...(exit ? { exit } : {}),
        },
      });
    }
} else if (flag("lifecycle")) shots = [];
else shots = JSON.parse(fs.readFileSync(shotsFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({
  entryPoints: [path.join(ROOT, "scripts/fps/c4-capture/entry.ts")],
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
// --arm=<json>: arm tuning overrides for c4-viewmodel.ts (globalThis.__c4arm), previews only.
if (flag("arm")) await page.addInitScript((o) => (globalThis.__c4arm = o), JSON.parse(flag("arm")));
page.on(
  "console",
  (m) => (m.type() === "error" || m.type() === "warning") && console.error("page:", m.text()),
);
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.c4Capture === "function");
if (flag("lifecycle")) {
  const result = await page.evaluate((n) => window.c4Lifecycle(n), Number(flag("lifecycle")));
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
    ([v, s, ww, hh]) => window.c4Capture(v, s, ww, hh),
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
    stats[name] = { calls: r.calls, triangles: r.triangles, debug: r.debug };
  }
}
fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(stats).slice(0, 6))));
await browser.close();
server.close();
