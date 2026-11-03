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
    "9-superstore-car-park": at("island-superstore", -60, 130, 1.7, 0, 0, 6),
    "10-military-base-gate": at("southern-military-base", 30, 230, 1.7, 0, 0, 5),
    "11-military-base-from-tower": at("southern-military-base", -160, -160, 14, 0, 0, 0),
    "12-airfield-apron": at("island-airfield", 60, 20, 1.7, -40, -150, 6),
    "13-superstore-from-air": at("island-superstore", 250, 330, 190, 0, 0, 0),
    "14-island-village": at("island-village", 60, 70, 1.7, 0, 0, 3),
    "15-airfield-from-air": at("island-airfield", -150, 200, 160, 0, -100, 0),
    "17-northstar-from-air": at("northstar-town", 220, 260, 170, 0, 0, 0),
    "18-millhaven-water-tower": at("millhaven", 60, 40, 1.7, 32, -64, 18),
    "19-crossroads-junction": at("crossroads", 70, 90, 1.7, 0, 0, 3),
    "20-central-hospital": at("central-hospital", 0, 170, 1.7, 0, 0, 10),
    "21-blackwater-prison-from-air": at("blackwater-prison", 140, 160, 110, 0, 0, 0),
    "22-riverwood-street": at("riverwood", -100, 60, 1.7, 100, -40, 2),
    "23-east-works": at("east-works", 60, 120, 1.7, -30, -40, 6),
    "24-murder-cabins": at("murder-cabins", 160, 160, 60, 0, 0, 0),
    "25-redstone-quarry-from-air": at("redstone-quarry", 900, 500, 420, 150, 0, 0),
    "26-quarry-plant": at("redstone-quarry", 380, 60, 1.7, 560, -40, 8),
    "27-old-dam-face": (() => {
      const d = m.bridges.find((b) => b.id === "old-dam");
      const mx = (d.a[0] + d.b[0]) / 2,
        mz = (d.a[1] + d.b[1]) / 2;
      return [
        [mx - 160, 75, mz - 330],
        [mx, 50, mz],
      ];
    })(),
    "28-on-the-dam": (() => {
      const d = m.bridges.find((b) => b.id === "old-dam");
      const x = d.a[0] + (d.b[0] - d.a[0]) * 0.25,
        z = d.a[1] + (d.b[1] - d.a[1]) * 0.25;
      return [
        [x, 70, z],
        [d.b[0], 66, d.b[1]],
      ];
    })(),
    // Aimed at the first countryside farm and compound in the layout (positions shift as it grows).
    ...(() => {
      const l = window.explorer.layout();
      const first = (model) => l.find((p) => p.poi === "countryside" && p.model === model);
      const near = (p, dx, dz, up, lookUp) => [
        eye(p.x + dx, p.z + dz, up),
        [p.x, p.y + lookUp, p.z],
      ];
      const barn = first("barn"),
        ruin = first("rural-wood-4");
      return {
        ...(barn ? { "29-farm": near(barn, 45, 50, 6, 4) } : {}),
        ...(ruin ? { "30-abandoned-compound": near(ruin, 50, -40, 3, 3) } : {}),
        ...(() => {
          const rock = l.find(
            (p) =>
              p.poi === "nature" &&
              p.model === "rock-big-1" &&
              Math.abs(p.x) < 3000 &&
              Math.abs(p.z) < 3000,
          );
          const bush = l.find(
            (p) => p.poi === "nature" && p.model === "bush-tall" && Math.abs(p.x) < 3000,
          );
          return {
            ...(rock ? { "36-boulder-cover": near(rock, 22, 18, 1.7, 1.5) } : {}),
            ...(bush ? { "37-bushes": near(bush, 8, 6, 1.7, 0.8) } : {}),
            ...(() => {
              const poles = l.filter((p) => p.model === "power-pole");
              const pole = poles[Math.floor(poles.length / 3)];
              return pole ? { "38-power-line": near(pole, 35, 30, 1.7, 7) } : {};
            })(),
          };
        })(),
      };
    })(),
    "31-countryside-from-air": [
      [-2400, 420, -2900],
      [-2700, 20, -3500],
    ],
    "32-prison-gate": at("blackwater-prison", 25, -175, 1.7, 0, 0, 4),
    "33-hospital-helipad": at("central-hospital", 190, 120, 12, 0, 0, 8),
    "34-iron-peaks-radio-mast": (() => {
      const p = m.perches?.[0];
      return p
        ? [
            [p.x + 260, p.y + 60, p.z + 380],
            [p.x, p.y + 20, p.z],
          ]
        : [
            [0, 500, 0],
            [0, 0, -4000],
          ];
    })(),
    "35-from-a-sniper-perch": (() => {
      const p = m.perches?.[2];
      return p
        ? [
            [p.x, p.y + 1.7, p.z],
            [p.x + 600, p.y - 200, p.z + 2000],
          ]
        : [
            [0, 500, 0],
            [0, 0, -4000],
          ];
    })(),
    "16-on-the-west-bridge": (() => {
      const b = m.bridges[0];
      const x = b.a[0] + (b.b[0] - b.a[0]) * 0.3,
        z = b.a[1] + (b.b[1] - b.a[1]) * 0.3;
      return [
        [x, 14, z],
        [b.b[0], 8, b.b[1]],
      ];
    })(),
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
// Fairness (PLAN §10): the same viewpoint at render scale 1.0 and 0.6 draws the same cover.
const fairView = views["9-superstore-car-park"] ?? Object.values(views)[0];
const drawnAt = async (ratio) => {
  await page.evaluate((r) => window.explorer.setPixelRatio(r), ratio);
  const s = await page.evaluate(([p, l]) => window.explorer.view(p, l), fairView);
  return { props: s.props, trees: s.trees, nearTrees: s.nearTrees, patches: s.patches };
};
const full = await drawnAt(1.0),
  reduced = await drawnAt(0.6);
const fair = JSON.stringify(full) === JSON.stringify(reduced);
console.log(
  "fairness (scale 1.0 vs 0.6 draws the same cover):",
  fair ? "ok" : "MISMATCH",
  full,
  reduced,
);
report.fairness = { ok: fair, full, reduced };
await page.evaluate(() => window.explorer.setPixelRatio(1));
// Context-loss recovery: lose and restore the GL context, redraw the same view.
const before = await page.evaluate(([p, l]) => window.explorer.view(p, l), fairView);
const recovery = await page.evaluate(() => window.explorer.loseContext());
const after = await page.evaluate(([p, l]) => window.explorer.view(p, l), fairView);
const same = before.calls === after.calls && before.triangles === after.triangles;
console.log(
  "context loss:",
  recovery.recovered && same ? "recovered" : "FAILED",
  `calls ${before.calls} -> ${after.calls}, triangles ${before.triangles} -> ${after.triangles}`,
);
report.contextLoss = { recovered: recovery.recovered, before: before.calls, after: after.calls };
await page.screenshot({ path: path.join(outDir, "after-context-loss.jpg"), quality: 80 });
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
const programs = await page.evaluate(() => window.explorer.programs());
fs.writeFileSync(path.join(outDir, "programs.json"), JSON.stringify(programs, null, 1));
console.log("programs", programs.length);
await browser.close();
server.close();
