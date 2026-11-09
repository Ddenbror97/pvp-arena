/**
 * Door and interior review, headless: for each model with doors, three shots per doorway
 * (outside with the door shut, just inside looking in with it open, from the room back to the
 * doorway) and two from the middle of the ground floor, composed into one sheet per model.
 *
 *   node scripts/br/interior-review/capture.mjs <outDir> [--chromium=/path] [--boxes] [id ...]
 *
 * With no ids: every model with doors. --boxes overlays the collision boxes in red.
 * VIEWS=<json> (model-local [[eye], [target], open] list) replaces the automatic views.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const args = process.argv.slice(2);
const outDir = path.resolve(args.shift());
const exe = args.find((a) => a.startsWith("--chromium="))?.slice(11);
const boxes = args.includes("--boxes");
let only = args.filter((a) => !a.startsWith("--"));
only.explicit = only.length > 0;
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/interior-review/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    logLevel: "error",
    alias: { "@": path.join(ROOT, "src") },
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>body{margin:0}</style><script type=module src='r.js'></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/r.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
// REV=access-v7 reviews a revision before world.ts points at it.
const rev = process.env.REV;
await page.goto(
  `http://127.0.0.1:${server.address().port}/` +
    (rev
      ? `?models=/fps/br/models/models.${rev}.json&collision=/fps/br/models/collision.${rev}.json`
      : ""),
);
await page.evaluate(() => window.interior.ready);
if (!only.length) {
  const c = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        process.env.REV
          ? `public/fps/br/models/collision.${process.env.REV}.json`
          : // The live revision (world.ts WORLD_ASSETS.collision).
            "public" +
              fs
                .readFileSync(path.join(ROOT, "src/lib/fps/br/world.ts"), "utf8")
                .match(/collision: "([^"]+)"/)[1],
      ),
      "utf8",
    ),
  );
  only = Object.assign(Object.keys(c.models), { explicit: false });
}
const custom = process.env.VIEWS ? JSON.parse(process.env.VIEWS) : null;
const summary = {};
for (const id of only) {
  const info = await page.evaluate((i) => window.interior.load(i), id);
  if (!info.doors.length && !only.explicit) continue;
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const b of info.boxes) {
    x0 = Math.min(x0, b[0]);
    z0 = Math.min(z0, b[2]);
    x1 = Math.max(x1, b[3]);
    z1 = Math.max(z1, b[5]);
  }
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const views = [];
  if (custom) views.push(...custom.map((v, i) => [`v${i}`, ...v]));
  else {
    info.doors.forEach((d, i) => {
      // The door plane's normal, pointing out of the building.
      const nx = d.along === "x" ? 0 : Math.sign(d.x - cx) || 1;
      const nz = d.along === "x" ? Math.sign(d.z - cz) || 1 : 0;
      const e = d.y0 + 1.6,
        t = d.y0 + 1.2;
      views.push([`d${i}-out`, [d.x + nx * 3.2, e, d.z + nz * 3.2], [d.x, t, d.z], false]);
      views.push([
        `d${i}-in`,
        [d.x - nx * 0.9, e, d.z - nz * 0.9],
        [d.x - nx * 8, e - 0.3, d.z - nz * 8],
        true,
      ]);
      views.push([`d${i}-back`, [d.x - nx * 4.5, e, d.z - nz * 4.5], [d.x, t, d.z], true]);
    });
    const y = (info.doors[0]?.y0 ?? 0) + 1.6;
    const long = x1 - x0 > z1 - z0;
    views.push(["mid-a", [cx, y, cz], long ? [x1, y - 0.3, cz] : [cx, y - 0.3, z1], true]);
    views.push(["mid-b", [cx, y, cz], long ? [x0, y - 0.3, cz] : [cx, y - 0.3, z0], true]);
  }
  const shots = [];
  for (const [name, eye, target, open] of views) {
    await page.evaluate(
      ([e, t, o, b]) => window.interior.view(e, t, o, b),
      [eye, target, open, boxes],
    );
    const file = path.join(outDir, `${id}-${name}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 80 });
    shots.push([name, file]);
  }
  // One sheet per model: three shots a row at half size, labelled.
  const cols = 3,
    w = 480,
    h = 270;
  const rows = Math.ceil(shots.length / cols);
  const tiles = await Promise.all(
    shots.map(async ([name, file], i) => ({
      input: await sharp(file)
        .resize(w, h)
        .composite([
          {
            input: Buffer.from(
              `<svg width="${w}" height="22"><rect width="${w}" height="22" fill="black" opacity="0.55"/><text x="6" y="16" font-family="sans-serif" font-size="14" fill="white">${id} ${name}</text></svg>`,
            ),
            top: 0,
            left: 0,
          },
        ])
        .toBuffer(),
      left: (i % cols) * w,
      top: Math.floor(i / cols) * h,
    })),
  );
  await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#222" } })
    .composite(tiles)
    .jpeg({ quality: 78 })
    .toFile(path.join(outDir, `sheet-${id}.jpg`));
  for (const [, file] of shots) fs.rmSync(file);
  summary[id] = { doors: info.doors };
  console.log(id, info.doors.length, "doors");
}
fs.writeFileSync(path.join(outDir, "doors.json"), JSON.stringify(summary, null, 1));
console.log("errors", errors.length ? errors : "none");
await browser.close();
server.close();
