/**
 * Render a registry map from first-person viewpoints in headless Chromium (SwiftShader WebGL2)
 * with the game's own map loader and lighting.
 *
 *   node scripts/fps/map-capture/capture.mjs <mapId> <outDir> [views.json] [--chromium=/path] [--quality=low]
 *   node scripts/fps/map-capture/capture.mjs --lifecycle=dustfront,lost-trail --cycles=4 [--chromium=/path]
 *
 * The second form is the map-switching / resource-cleanup check (see entry.ts `lifecycle`).
 *
 * Chromium: Playwright's, or any binary via --chromium (e.g. @sparticuz/chromium).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const [mapId, outDir, viewsFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const exe = flag("chromium");
const quality = flag("quality") === "low" ? "low" : "high";
const lifecycle = flag("lifecycle")?.split(",");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const spec = lifecycle
  ? {}
  : JSON.parse(
      fs.readFileSync(
        viewsFile ?? path.join(ROOT, "scripts/fps/map-capture", `${mapId}.views.json`),
        "utf8",
      ),
    );
const players = spec.players ?? [];
const views = spec.views ?? spec;
if (!lifecycle) fs.mkdirSync(outDir, { recursive: true });
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
    "--js-flags=--expose-gc",
    "--enable-precise-memory-info",
  ],
});
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.error("page:", m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.capture === "function");
if (lifecycle) {
  const cycles = Number(flag("cycles") ?? 3);
  const result = await page.evaluate(([ids, n]) => window.lifecycle(ids, n), [lifecycle, cycles]);
  // A leak is anything left behind that grows with each mount: after every dispose, GPU
  // geometries/textures must equal what was left after the first one (renderer-owned resources
  // such as three's BRDF lookup texture stay resident once created and are not per-map).
  const first = result.log[0].afterDispose;
  const leaks = result.log.filter(
    (e) => e.afterDispose.geometries > first.geometries || e.afterDispose.textures > first.textures,
  );
  const heap = {};
  for (const id of lifecycle) {
    const runs = result.log.filter((e) => e.map === id);
    heap[id] = { firstMB: runs[1]?.heapMB ?? runs[0].heapMB, lastMB: runs.at(-1).heapMB };
  }
  console.log(
    JSON.stringify(
      { ...result, residualAfterFirstDispose: first, leaks: leaks.length, heap },
      null,
      1,
    ),
  );
  await browser.close();
  server.close();
  process.exit(leaks.length ? 1 : 0);
}
const [w, h] = [960, 540];
const result = await page.evaluate(
  ([id, v, w, h, p, q]) => window.capture(id, v, w, h, p, q),
  [mapId, views, w, h, players, quality],
);
const stats = {
  mapId,
  quality,
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
