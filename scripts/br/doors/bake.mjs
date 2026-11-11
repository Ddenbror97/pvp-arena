/**
 * Building door bake (owner, 2026-11-08: "the doors work but there is a gap and they don't fit;
 * we need specific doors for houses"). For every model with doors:
 *
 *   1. list.ts: the doors, their openings and where each one's picture comes from;
 *   2. page.ts in Chromium: the painted door photographed off the untouched import (or a drawn
 *      door for procedural buildings), and the wall's depth either side of the opening;
 *   3. here: packed into one atlas (public/fps/br/models/doors.v10.webp) with doors.v10.json.
 *
 *   node scripts/br/doors/bake.mjs [--chromium=/path/to/chrome]
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const OUT = path.join(ROOT, "public/fps/br/models");
const tmp = path.join(ROOT, "node_modules/.cache/door-bake");
fs.mkdirSync(tmp, { recursive: true });
const LINING = 0.03;
const PAD = 4;
const ATLAS_W = 2048;

execFileSync(
  "node",
  [path.join(ROOT, "scripts/br/map-audit/run.mjs"), "../doors/list", path.join(tmp, "jobs.json")],
  {
    cwd: ROOT,
    stdio: "inherit",
  },
);
const jobs = JSON.parse(fs.readFileSync(path.join(tmp, "jobs.json"), "utf8"));
await build({
  entryPoints: [path.join(ROOT, "scripts/br/doors/page.ts")],
  bundle: true,
  format: "esm",
  outfile: path.join(tmp, "page.js"),
  logLevel: "error",
});
fs.writeFileSync(
  path.join(tmp, "index.html"),
  '<!doctype html><body style="margin:0"><script type="module" src="page.js"></script>',
);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = u.startsWith("/fps/")
    ? path.join(ROOT, "public", u)
    : path.join(tmp, u === "/" ? "index.html" : u);
  if (!fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": f.endsWith(".js")
      ? "text/javascript"
      : f.endsWith(".html")
        ? "text/html"
        : "application/octet-stream",
  });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page:", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.ready);
const tiles = [];
for (const job of jobs) {
  const r = await page.evaluate(([j, l]) => window.bake(j, l), [job, LINING]);
  const png = Buffer.from(r.image.split(",")[1], "base64");
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Transparent texels (nothing behind the slab): the average of the rest.
  let sum = [0, 0, 0],
    n = 0;
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] > 128) {
      for (let c = 0; c < 3; c++) sum[c] += data[i + c];
      n++;
    }
  const fill = sum.map((s) => (n ? s / n : 128));
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] <= 128) for (let c = 0; c < 4; c++) data[i + c] = c < 3 ? fill[c] : 255;
    else data[i + 3] = 255;
  // The lining takes the door's rim colour (its frame or trim).
  let rim = [0, 0, 0],
    rn = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (x < 3 || y < 3 || x >= info.width - 3) {
        const i = (y * info.width + x) * 4;
        for (let c = 0; c < 3; c++) rim[c] += data[i + c];
        rn++;
      }
  job.out = r.out;
  tiles.push({
    job,
    data,
    w: info.width,
    h: info.height,
    front: r.front,
    back: r.back,
    rim: rim.map((v) => Math.round(v / rn)),
  });
}
await browser.close();
server.close();

// Shelf packing, tallest first, each tile padded by repeating its edge texels.
tiles.sort((a, b) => b.h - a.h);
let x = 0,
  y = 0,
  shelf = 0;
for (const t of tiles) {
  if (x + t.w + 2 * PAD > ATLAS_W) {
    x = 0;
    y += shelf;
    shelf = 0;
  }
  t.ax = x + PAD;
  t.ay = y + PAD;
  x += t.w + 2 * PAD;
  shelf = Math.max(shelf, t.h + 2 * PAD);
}
const H = 1 << Math.ceil(Math.log2(y + shelf));
const atlas = Buffer.alloc(ATLAS_W * H * 4);
for (const t of tiles)
  for (let yy = -PAD; yy < t.h + PAD; yy++)
    for (let xx = -PAD; xx < t.w + PAD; xx++) {
      const sx = Math.min(t.w - 1, Math.max(0, xx)),
        sy = Math.min(t.h - 1, Math.max(0, yy));
      const s = (sy * t.w + sx) * 4,
        d = ((t.ay + yy) * ATLAS_W + t.ax + xx) * 4;
      t.data.copy(atlas, d, s, s + 4);
    }
await sharp(atlas, { raw: { width: ATLAS_W, height: H, channels: 4 } })
  .removeAlpha()
  .webp({ quality: 88, effort: 6 })
  .toFile(path.join(OUT, "doors.v10.webp"));
const models = {};
for (const t of tiles) {
  const j = t.job;
  (models[j.model] ??= [])[j.index] = {
    // Atlas rectangle (texels, top-left origin) of the door as seen from outside.
    rect: [t.ax, t.ay, t.w, t.h],
    style: j.style,
    // The opening along the wall (model space, along `along`): its width, and its middle's
    // offset from the door's own centre; sill and head.
    width: +(j.hi - j.lo).toFixed(3),
    shift: +((j.lo + j.hi) / 2 - j.centre).toFixed(3),
    y0: +j.y0.toFixed(3),
    y1: +j.y1.toFixed(3),
    /** Outward side of the wall (+1/−1 along the axis across the wall). */
    out: j.out,
    /** Wall faces from the door's plane: outside, inside (m). */
    front: +t.front.toFixed(3),
    back: +t.back.toFixed(3),
    rim: t.rim,
  };
}
fs.writeFileSync(
  path.join(OUT, "doors.v10.json"),
  JSON.stringify({ atlas: [ATLAS_W, H], lining: LINING, models }) + "\n",
);
console.log(
  `doors.v10: ${tiles.length} doors, atlas ${ATLAS_W}×${H}, ${Math.round(fs.statSync(path.join(OUT, "doors.v10.webp")).size / 1024)} kB`,
);
