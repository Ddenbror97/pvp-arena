/**
 * Render a registry map from first-person viewpoints in headless Chromium (SwiftShader WebGL2)
 * with the game's own map loader and lighting.
 *
 *   node scripts/fps/map-capture/capture.mjs <mapId> <outDir> [views.json] [--chromium=/path]
 *
 * Chromium: Playwright's, or any binary via --chromium (e.g. @sparticuz/chromium).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const [mapId, outDir, viewsFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const spec = JSON.parse(
  fs.readFileSync(
    viewsFile ?? path.join(ROOT, "scripts/fps/map-capture", `${mapId}.views.json`),
    "utf8",
  ),
);
const players = spec.players ?? [];
const views = spec.views ?? spec;
fs.mkdirSync(outDir, { recursive: true });
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
  res.writeHead(200, {
    "content-type": file.endsWith(".glb") ? "model/gltf-binary" : "application/octet-stream",
  });
  // (Character and map GLBs are served from public/.)
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
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
page.on("console", (m) => m.type() === "error" && console.error("page:", m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.capture === "function");
const [w, h] = [960, 540];
const result = await page.evaluate(
  ([id, v, w, h, p]) => window.capture(id, v, w, h, p),
  [mapId, views, w, h, players],
);
const stats = {
  mapId,
  loadMs: result.loadMs,
  geometries: result.geometries,
  textures: result.textures,
  programs: result.programs,
  views: {},
};
for (const [name, v] of Object.entries(result.views)) {
  fs.writeFileSync(path.join(outDir, `${name}.jpg`), Buffer.from(v.image.split(",")[1], "base64"));
  stats.views[name] = { calls: v.calls, triangles: v.triangles };
}
fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats, null, 1));
console.log(JSON.stringify(stats));
await browser.close();
server.close();
