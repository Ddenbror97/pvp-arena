/**
 * Project Island explorer captures (headless Chromium, SwiftShader): fixed viewpoints over the
 * real terrain renderer, screenshots and draw statistics.
 *
 *   node scripts/br/explorer/capture.mjs [outDir] [--chromium=/path] [--size=1280x720]
 *
 * Also writes outDir/site/ (index.html, explorer.js and the world files) for a real-GPU check:
 * open it with ?fly=1 (WASD, mouse, Shift fast, F walk).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/explorer",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const [W, H] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1280x720")
  .split("x")
  .map(Number);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/explorer/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><title>Project Island explorer</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='explorer.js'></script>";
// Static copy for real-GPU checks.
const site = path.join(outDir, "site");
fs.mkdirSync(path.join(site, "fps/br"), { recursive: true });
fs.writeFileSync(path.join(site, "index.html"), html);
fs.writeFileSync(path.join(site, "explorer.js"), js);
fs.cpSync(path.join(ROOT, "public/fps/br"), path.join(site, "fps/br"), { recursive: true });

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/explorer.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.explorer, null, { timeout: 60000 });
await page.evaluate(() => window.explorer.ready);
const loadMs = await page.evaluate(() => window.loadMs);
const views = await page.evaluate(() => {
  const m = window.explorer.meta();
  const g = (x, z) => window.explorer.groundAt(x, z);
  const poi = (id) => m.pois.find((p) => p.id === id);
  const eye = (x, z, up = 1.7) => [x, g(x, z) + up, z];
  const at = (id, dx, dz, up, lookDx, lookDz, lookUp = 0) => {
    const p = poi(id);
    const x = p.x + dx,
      z = p.z + dz,
      lx = p.x + lookDx,
      lz = p.z + lookDz;
    return [eye(x, z, up), [lx, g(lx, lz) + lookUp, lz]];
  };
  return {
    "1-overview-from-the-plane": [
      [0, 2600, 6200],
      [0, 0, -300],
    ],
    "2-plane-route-altitude": [
      [-5200, 800, 2000],
      [0, 0, -500],
    ],
    "3-iron-peaks-from-pine-ridge": at("pine-ridge", 0, 300, 2, 300, -1700, 120),
    "4-northstar-town-street": at("northstar-town", -150, 120, 1.7, 400, -200, 1),
    "5-redstone-quarry-rim": at("redstone-quarry", -820, 300, 2, 0, 0, 10),
    "6-strait-and-west-bridge": at("blackwater-prison", -200, 1700, 25, -350, 3600, 0),
    "7-island-superstore-pad": at("island-superstore", -350, 250, 2, 0, 0, 2),
    "8-main-river-valley": at("crossroads", -300, 900, 6, -2000, 1100, 2),
  };
});
const report = { loadMs, views: {} };
for (const [name, [pos, look]] of Object.entries(views)) {
  const s = await page.evaluate(([p, l]) => window.explorer.view(p, l), [pos, look]);
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 82 });
  report.views[name] = s;
  console.log(name, JSON.stringify(s));
}
report.errors = errors;
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log("load ms", Math.round(loadMs), "errors", errors.length ? errors : "none");
await browser.close();
server.close();
