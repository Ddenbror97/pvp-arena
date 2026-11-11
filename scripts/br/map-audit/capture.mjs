/**
 * Map audit captures from the game's own island renderer (scripts/br/explorer, the same
 * island-scene module the match uses), headless Chromium with SwiftShader:
 *
 *   node scripts/br/map-audit/capture.mjs <outDir> [--topdown] [--views] [--tile=400]
 *
 * --topdown: one straight-down tile per 1 km grid square (north up), stitched by the caller.
 * --views:   the audit's eye-level and aerial views per location, with draw statistics.
 * --custom=<file.json>: extra named views, positions relative to the ground.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2]);
const TILE = Number(process.argv.find((a) => a.startsWith("--tile="))?.slice(7) ?? 400);
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
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='explorer.js'></script>";
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
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errors = [];
async function open(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.explorer, null, { timeout: 120000 });
  await page.evaluate(() => window.explorer.ready);
  return page;
}
const report = { tiles: {}, views: {} };

if (process.argv.includes("--topdown")) {
  const page = await open(TILE, TILE);
  report.loadMs = await page.evaluate(() => window.loadMs);
  const dir = path.join(outDir, "tiles");
  fs.mkdirSync(dir, { recursive: true });
  // 1 km square seen straight down from 1 km above its mean ground: fov 2·atan(0.5).
  const fov = (2 * Math.atan(0.5) * 180) / Math.PI;
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cx = -5000 + c * 1000 + 500,
        cz = -5000 + r * 1000 + 500;
      const base = await page.evaluate(
        ([x, z]) => {
          let s = 0;
          for (let i = -2; i <= 2; i++)
            for (let j = -2; j <= 2; j++)
              s += Math.max(0, window.explorer.groundAt(x + i * 200, z + j * 200));
          return s / 25;
        },
        [cx, cz],
      );
      const s = await page.evaluate(
        ([x, z, y, f]) => window.explorer.view([x, y, z], [x, 0, z], { up: [0, 0, -1], fov: f }),
        [cx, cz, base + 1000, fov],
      );
      const ref = `${"ABCDEFGHIJ"[c]}${r + 1}`;
      await page.screenshot({ path: path.join(dir, `${ref}.png`) });
      report.tiles[ref] = s;
    }
  await page.close();
}

if (process.argv.includes("--views")) {
  const page = await open(1280, 720);
  report.loadMs ??= await page.evaluate(() => window.loadMs);
  const views = await page.evaluate(() => {
    const m = window.explorer.meta();
    const g = (x, z) => window.explorer.groundAt(x, z);
    const poi = (id) => m.pois.find((p) => p.id === id);
    const at = (id, dx, dz, up, lookDx, lookDz, lookUp = 0) => {
      const p = poi(id);
      const x = p.x + dx,
        z = p.z + dz,
        lx = p.x + lookDx,
        lz = p.z + lookDz;
      return [
        [x, g(x, z) + up, z],
        [lx, g(lx, lz) + lookUp, lz],
      ];
    };
    // Oblique aerial: 45° down from the south-east at a distance that frames the POI radius.
    const aerial = (id, k = 1) => {
      const p = poi(id);
      const d = p.radius * 0.9 * k;
      return [
        [p.x + d * 0.6, g(p.x, p.z) + d, p.z + d],
        [p.x, g(p.x, p.z), p.z],
      ];
    };
    const b0 = m.bridges[0],
      b1 = m.bridges[1],
      dam = m.bridges.find((b) => b.id === "old-dam");
    const lerp = (b, t) => [b.a[0] + (b.b[0] - b.a[0]) * t, b.a[1] + (b.b[1] - b.a[1]) * t];
    const rw = m.runways[0],
      rw2 = m.runways[1];
    return {
      "02-northstar-street": at("northstar-town", -150, 120, 1.7, 400, -200, 1),
      "02b-northstar-aerial": aerial("northstar-town", 0.7),
      "03-iron-peaks-from-pine-ridge": at("pine-ridge", 0, 300, 2, 300, -1700, 120),
      "03b-iron-peaks-aerial": aerial("iron-peaks", 1.2),
      "04-quarry-aerial": aerial("redstone-quarry", 0.9),
      "04b-quarry-inside": at("redstone-quarry", 0, 0, 1.7, -400, 200, 40),
      "05-millhaven-street": at("millhaven", 60, 40, 1.7, 32, -64, 18),
      "05b-millhaven-aerial": aerial("millhaven", 0.7),
      "06-crossroads-fields": at("crossroads", 70, 90, 1.7, 500, 400, 3),
      "06b-crossroads-aerial": aerial("crossroads", 1),
      "07-hospital-exterior": at("central-hospital", 0, 170, 1.7, 0, 0, 10),
      "07b-hospital-aerial": aerial("central-hospital", 0.6),
      "08-old-dam": [
        [(dam.a[0] + dam.b[0]) / 2 - 160, 75, (dam.a[1] + dam.b[1]) / 2 - 330],
        [(dam.a[0] + dam.b[0]) / 2, 50, (dam.a[1] + dam.b[1]) / 2],
      ],
      "08b-old-dam-aerial": aerial("old-dam", 1.4),
      "09-prison-gate": at("blackwater-prison", 25, -175, 1.7, 0, 0, 4),
      "09b-prison-aerial": aerial("blackwater-prison", 0.6),
      "10-riverwood-street": at("riverwood", -100, 60, 1.7, 100, -40, 2),
      "10b-riverwood-aerial": aerial("riverwood", 0.7),
      "11-murder-cabins-forest": at("murder-cabins", 60, 80, 1.7, -100, -60, 2),
      "11b-murder-cabins-aerial": aerial("murder-cabins", 0.6),
      "12-military-runway": (() => {
        const [x, z] = [rw.a[0] + (rw.b[0] - rw.a[0]) * 0.2, rw.a[1] + (rw.b[1] - rw.a[1]) * 0.2];
        return [
          [x, g(x, z) + 1.7, z],
          [rw.b[0], g(rw.b[0], rw.b[1]) + 2, rw.b[1]],
        ];
      })(),
      "12b-military-aerial": aerial("southern-military-base", 0.7),
      "13-superstore": at("island-superstore", -60, 130, 1.7, 0, 0, 6),
      "13b-superstore-aerial": aerial("island-superstore", 0.6),
      "14-west-bridge-deck": (() => {
        const [x, z] = lerp(b0, 0.3);
        return [
          [x, b0.deck + 1.7, z],
          [b0.b[0], b0.deck, b0.b[1]],
        ];
      })(),
      "14b-west-bridge-from-shore": (() => {
        const [x, z] = lerp(b0, 0.5);
        return [
          [x - 450, 30, z - 150],
          [x, 10, z],
        ];
      })(),
      "14c-east-bridge-from-shore": (() => {
        const [x, z] = lerp(b1, 0.5);
        return [
          [x + 450, 30, z - 150],
          [x, 10, z],
        ];
      })(),
      "15-airfield": at("island-airfield", 60, 20, 1.7, -40, -150, 6),
      "15b-airfield-aerial": (() => {
        const mx = (rw2.a[0] + rw2.b[0]) / 2,
          mz = (rw2.a[1] + rw2.b[1]) / 2;
        return [
          [mx + 300, 600, mz + 600],
          [mx, 0, mz],
        ];
      })(),
      "16-pine-ridge": at("pine-ridge", 40, 40, 1.7, 300, -200, 10),
      "17-east-works": at("east-works", 60, 120, 1.7, -30, -40, 6),
      "18-river-crossing-crossroads-south": at("crossroads", -300, 900, 6, -2000, 1100, 2),
    };
  });
  for (const [name, [pos, look]] of Object.entries(views)) {
    const s = await page.evaluate(([p, l]) => window.explorer.view(p, l), [pos, look]);
    await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 84 });
    report.views[name] = { pos: pos.map((v) => Math.round(v)), ...s };
    console.log(name, JSON.stringify(s));
  }
  await page.close();
}
// --custom=<file.json>: {"name": [[x, y, z], [lx, ly, lz]], …} with y relative to the ground.
const custom = process.argv.find((a) => a.startsWith("--custom="))?.slice(9);
if (custom) {
  const page = await open(1280, 720);
  for (const [name, [pos, look]] of Object.entries(JSON.parse(fs.readFileSync(custom, "utf8")))) {
    // "name@lite": with the budget's lite ground shading; "@r80": its shortened near range.
    await page.evaluate(
      ([lite, r]) =>
        window.explorer.setGroundLite(lite).then(() => window.explorer.setGroundRange(r)),
      [name.includes("@lite"), name.includes("@r80") ? 80 : 140],
    );
    const s = await page.evaluate(
      ([p, l]) => {
        const g = (x, z) => window.explorer.groundAt(x, z);
        return window.explorer.view(
          [p[0], g(p[0], p[2]) + p[1], p[2]],
          [l[0], g(l[0], l[2]) + l[1], l[2]],
        );
      },
      [pos, look],
    );
    await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 84 });
    report.views[name] = s;
  }
  await page.close();
}
report.errors = errors;
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log("errors", errors.length ? errors : "none");
await browser.close();
server.close();
