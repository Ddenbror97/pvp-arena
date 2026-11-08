/**
 * Render the first-person Karambit at chosen clip times in headless Chromium.
 *   node scripts/fps/viewmodel-capture/capture.mjs <ak|m4> <outDir> <shots.json> [--chromium=/path] [--size=960x540] [--fov=60] [--weapon=rifle]
 * shots.json: [{ "clip": "karambit_idle", "t": 0.5, "name": "idle" }, ...]
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
const shots = JSON.parse(fs.readFileSync(shotsFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({
  entryPoints: [path.join(ROOT, "scripts/fps/viewmodel-capture/entry.ts")],
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
// --stance='{"R":{"wrist":[0.15,-0.15,-0.3]},...}' previews the two-hand stance (karambit-viewmodel
// KARAMBIT_STANCE); --grip='{"handlePalm":0.034,...}' previews the rebuilt fist (GRIP).
if (flag("stance"))
  await page.addInitScript((v) => (globalThis.__stance = v), JSON.parse(flag("stance")));
if (flag("glove-tune"))
  await page.addInitScript((v) => (globalThis.__gloveTune = v), flag("glove-tune") === "1");
if (flag("finger-fill"))
  await page.addInitScript((v) => (globalThis.__fingerFill = v), Number(flag("finger-fill")));
if (flag("keep-thumb"))
  await page.addInitScript((v) => (globalThis.__keepThumbL = v), Number(flag("keep-thumb")));
if (flag("relax-l"))
  await page.addInitScript((v) => (globalThis.__relaxL = v), JSON.parse(flag("relax-l")));
if (flag("grip"))
  await page.addInitScript((v) => (globalThis.__grip = v), JSON.parse(flag("grip")));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.viewmodelCapture === "function");
// --weapon=rifle renders the team rifle viewmodel (sleeves, watch) instead of the Karambit.
const rifle = flag("weapon") === "rifle";
const result = await page.evaluate(
  ([v, s, w, h, f, r, g]) =>
    r ? window.rifleCapture(v, s, w, h, f, g ?? undefined) : window.viewmodelCapture(v, s, w, h, f),
  [
    variant,
    shots,
    w,
    h,
    Number(flag("fov") ?? 60),
    rifle,
    flag("guard-twist") ? Number(flag("guard-twist")) : null,
  ],
);
const stats = {};
for (const [name, r] of Object.entries(result)) {
  fs.writeFileSync(path.join(outDir, `${name}.jpg`), Buffer.from(r.image.split(",")[1], "base64"));
  stats[name] = { calls: r.calls, triangles: r.triangles };
}
fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats, null, 1));
console.log(JSON.stringify(stats));
await browser.close();
server.close();
