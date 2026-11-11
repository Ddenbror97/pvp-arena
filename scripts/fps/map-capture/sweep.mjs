/**
 * Visibility sweep of a map (render audit): eye-height views on a grid over the walkable floor
 * (`views.json`: [[x, y, z, yaw, pitch], ...], see sweep-views.ts), each compared with what is
 * really visible (window.sweep in entry.ts). Writes <out>.json.
 *
 *   node scripts/fps/map-capture/sweep.mjs <mapId> <views.json> <out.json> [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [mapId, viewsFile, outFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const views = JSON.parse(fs.readFileSync(viewsFile, "utf8"));
const bundle = await build({
  entryPoints: [path.join(ROOT, "scripts/fps/map-capture/entry.ts")],
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
      "<!doctype html><html><body style='margin:0'><script type=module src='/capture.js'></script></body></html>",
    );
  if (url === "/capture.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  res.writeHead(200, { "content-type": "application/octet-stream" });
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
  ],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.sweep === "function");
const result = await page.evaluate(([id, v]) => window.sweep(id, v, 480, 270), [mapId, views]);
fs.writeFileSync(outFile, JSON.stringify({ mapId, viewsIn: views, ...result }));
const col = (k) => result.views.map((v) => v[k]).sort((a, b) => a - b);
const q = (xs, p) => xs[Math.min(xs.length - 1, Math.floor(xs.length * p))];
const row = (name, k) =>
  `${name}: p50 ${q(col(k), 0.5)} p95 ${q(col(k), 0.95)} max ${q(col(k), 1)}`;
console.log(mapId, result.views.length, "views,", result.meshes.length, "meshes");
for (const [n, k] of [
  ["calls submitted", 0],
  ["triangles submitted", 1],
  ["calls visible", 2],
  ["triangles visible", 3],
])
  console.log(" ", row(n, k));
await browser.close();
server.close();
