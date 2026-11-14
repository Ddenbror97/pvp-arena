/**
 * See-through audit of a 5v5 map (owner, 2026-11-14): back faces seen from behind and gameplay
 * solids with nothing drawn on them, from every standable spot (window.seeThrough in entry.ts).
 * Cells are merged into patches (neighbouring 0.5 m cells of one mesh or solid).
 *
 *   node scripts/fps/map-capture/see-through.mjs <mapId> <views.json> <out.json> [--size=480x270]
 *        [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [mapId, viewsFile, outFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const [w, h] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "480x270")
  .split("x")
  .map(Number);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const views = JSON.parse(fs.readFileSync(viewsFile, "utf8"));
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/fps/map-capture/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    loader: { ".webp": "empty", ".png": "empty" },
    logLevel: "error",
  })
).outputFiles[0].text;
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
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("pageerror", (e) => console.error("pageerror", e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.seeThrough === "function");
const t0 = Date.now();
const result = await page.evaluate(
  ([id, v, ww, hh]) => window.seeThrough(id, v, ww, hh),
  [mapId, views, w, h],
);
await browser.close();
server.close();
/** Join neighbouring cells of one mesh or solid into patches. */
const patches = (spots) => {
  const byWhat = new Map();
  for (const s of spots) (byWhat.get(s.what) ?? byWhat.set(s.what, []).get(s.what)).push(s);
  const out = [];
  for (const [what, list] of byWhat) {
    const seen = new Set();
    for (const s of list) {
      if (seen.has(s)) continue;
      const group = [s];
      seen.add(s);
      for (let k = 0; k < group.length; k++)
        for (const o of list)
          if (
            !seen.has(o) &&
            Math.abs(o.x - group[k].x) <= 0.75 &&
            Math.abs(o.y - group[k].y) <= 0.75 &&
            Math.abs(o.z - group[k].z) <= 0.75
          ) {
            seen.add(o);
            group.push(o);
          }
      const n = group.reduce((a, g) => a + g.n, 0);
      const top = group.reduce((a, g) => (g.worst > a.worst ? g : a));
      const c = (k) => +(group.reduce((a, g) => a + g[k], 0) / group.length).toFixed(1);
      out.push({
        what,
        pixels: n,
        cells: group.length,
        centre: [c("x"), c("y"), c("z")],
        worstView: top.at,
        view: views[top.at],
        worstPixels: top.worst,
      });
    }
  }
  return out.sort((a, b) => b.pixels - a.pixels);
};
const out = {
  mapId,
  views: views.length,
  size: [w, h],
  back: patches(result.back),
  unclad: patches(result.unclad),
};
// Per solid: the share of the pixels it is the nearest solid in that show nothing drawn on it.
out.solids = Object.entries(result.solids)
  .map(([id, [seen, bare]]) => ({ id, seen, bare, share: +(bare / seen).toFixed(3) }))
  .filter((s) => s.bare > 0)
  .sort((a, b) => b.bare - a.bare);
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`${mapId}: ${views.length} views in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log("\nsolids by bare pixels (seen, bare, share bare):");
for (const x of out.solids.slice(0, 50))
  console.log(
    String(x.seen).padStart(9),
    String(x.bare).padStart(8),
    x.share.toFixed(2).padStart(6),
    x.id,
  );
for (const k of ["back", "unclad"]) {
  const list = out[k];
  console.log(`\n${k}: ${list.length} patches, ${list.reduce((a, p) => a + p.pixels, 0)} pixels`);
  for (const p of list.slice(0, 40))
    console.log(
      String(p.pixels).padStart(8),
      String(p.worstPixels).padStart(6),
      JSON.stringify(p.centre).padEnd(22),
      p.what,
    );
}
