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
await page.goto(`http://127.0.0.1:${server.address().port}/${process.env.FLAT ? "?flat=1" : ""}`);
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
            // The open country (wildlands, 2026-11-08): a crag, a cliff field, ruins, a lookout
            // and a pylon line, aimed at the first of each in the layout.
            ...(() => {
              const one = (model) => l.find((p) => p.model === model);
              const crag = one("crag"),
                cliff = one("boulder-field"),
                abbey = one("abbey-ruins"),
                tower = one("fire-lookout"),
                cabin = one("ruined-cabin");
              const pylons = l.filter((p) => p.model === "pylon");
              const pylon = pylons[Math.floor(pylons.length / 2)];
              return {
                ...(crag ? { "50-crag": near(crag, 70, 60, 1.7, 8) } : {}),
                ...(cliff ? { "51-cliff-field": near(cliff, 110, 90, 6, 10) } : {}),
                ...(abbey ? { "52-abbey-ruins": near(abbey, 32, 26, 1.7, 3) } : {}),
                ...(tower ? { "53-fire-lookout": near(tower, 26, 22, 1.7, 8) } : {}),
                ...(cabin ? { "54-hunters-cabin": near(cabin, 12, 9, 1.7, 1.5) } : {}),
                ...(pylon ? { "55-pylon-line": near(pylon, 60, 70, 1.7, 14) } : {}),
                ...(crag ? { "56-open-country-from-air": near(crag, 320, 260, 150, 0) } : {}),
                // Landmarks (2026-11-08): the rail yard, the port, the power station, the
                // hospital, a school, the salvage yard, the military motor pool, a graveyard.
                ...(() => {
                  const first = (model) => l.find((p) => p.model === model);
                  const views = {};
                  for (const [name, model, dx, dz, up, lookUp] of [
                    ["60-rail-yard", "rail-depot", 70, 60, 6, 3],
                    ["61-port", "port-crane", 60, -90, 12, 15],
                    ["62-power-station", "smoke-stacks", 60, 70, 4, 15],
                    ["63-hospital", "hospital", 40, 60, 2, 8],
                    ["64-school", "school", 50, 80, 2, 4],
                    ["65-salvage-yard", "school-bus", 30, 30, 3, 1],
                    ["66-motor-pool", "tank", 25, 25, 2, 1],
                    ["67-graveyard", "chapel", 25, 20, 1.7, 3],
                    ["68-stranded-train", "diesel-loco", 25, 20, 1.7, 2],
                  ]) {
                    const p = first(model);
                    if (p) views[name] = near(p, dx, dz, up, lookUp);
                  }
                  // Inside the fitted-out landmarks (model-local eye and target; all turn 0).
                  const inside = (model, ex, ey, ez, tx, ty, tz) => {
                    const p = first(model);
                    return p
                      ? [
                          [p.x + ex, p.y + ey, p.z + ez],
                          [p.x + tx, p.y + ty, p.z + tz],
                        ]
                      : null;
                  };
                  for (const [name, ...a] of [
                    ["69-hospital-lobby", "hospital", 14, 1.7, 8, -12, 1.5, -1],
                    ["70-hospital-first-floor", "hospital", 14, 6.0, 8, -12, 5.8, 2],
                    ["71-hospital-stairs", "hospital", -14, 1.7, -9, -18.6, 3.0, -2],
                    ["72-school-classroom", "school", -18, 2.0, 25, -14, 1.8, 20.5],
                    ["73-school-corridor", "school", -26, 2.0, 17.6, 20, 1.8, 17.6],
                    ["74-school-gym", "school", 20, 2.3, -20, 2, 2.0, 0],
                    ["75-rail-depot-inside", "rail-depot", 4, 1.7, -8, -4, 2, 10],
                    ["76-chapel-inside", "chapel", -4.5, 2.0, 1.5, 5, 1.8, 0.8],
                    ["77-switch-house-inside", "brick-substation", 1.5, 1.7, 4, -1, 1.5, -4],
                  ]) {
                    const v = inside(...a);
                    if (v) views[name] = v;
                  }
                  // Location polish (2026-11-09): the quarry pit, Iron Peaks, Pine Ridge,
                  // Northstar's yards.
                  const firstIn = (model, poiId) =>
                    l.find((p) => p.model === model && (!poiId || p.poi === poiId));
                  for (const [name, model, poiId, dx, dz, up, lookUp] of [
                    ["80-quarry-pit-floor", "conveyor", "redstone-quarry", 45, 35, 3, 2],
                    ["82-quarry-bench-faces", "quarry-face", "redstone-quarry", 30, 30, 2, 5],
                    ["83-iron-peaks-hut", "old-hut", "iron-peaks", 14, 12, 1.7, 2],
                    ["84-pine-ridge-lumber-yard", "privacy-fence", "pine-ridge", 18, 22, 2, 1],
                    ["85-pine-ridge-cabin", "log-cabin", "pine-ridge", 10, 9, 1.7, 1.5],
                    ["86-northstar-yards", "yard-picket", "northstar-town", 9, 14, 1.7, 1],
                  ]) {
                    const p = firstIn(model, poiId);
                    if (p) views[name] = near(p, dx, dz, up, lookUp);
                  }
                  // Bridge ends (2026-11-11): the road onto each deck.
                  for (const b of m.bridges) {
                    const len = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
                    const dx = (b.b[0] - b.a[0]) / len,
                      dz = (b.b[1] - b.a[1]) / len;
                    for (const [end, [ex, ez], s] of [
                      ["a", b.a, -1],
                      ["b", b.b, 1],
                    ]) {
                      const x = ex + dx * s * 26 - dz * 7,
                        z = ez + dz * s * 26 + dx * 7;
                      views[`90-bridge-${b.id}-${end}`] = [
                        [x, g(x, z) + 3, z],
                        [ex - dx * s * 6, g(ex, ez) + 1, ez - dz * s * 6],
                      ];
                    }
                  }
                  return views;
                })(),
              };
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
    // The quarry as a mountain with its pit (2026-11-09), from the rim and from the air.
    "81-quarry-from-the-rim": at("redstone-quarry", -60, -900, 2, 0, 0, 0),
    "87-quarry-mountain-from-the-air": at("redstone-quarry", -1500, 1400, 500, 0, 0, 0),
    // Relief audit (2026-11-09): the new wooded ridge between Northstar and Pine Creek.
    "88-ridge-north-of-pine-creek": at("pine-ridge", -900, 500, 2, -1700, 120, 60),
    "33-hospital-helipad": at("central-hospital", 190, 120, 12, 0, 0, 8),
    // Map upgrades (owner, 2026-11-11): Eastport's waterfront, the Old Dam's water at the wall,
    // the higher Iron Peaks and Pine Ridge's rock band.
    ...(poi("eastport")
      ? {
          "90-eastport-from-the-sea": [
            [5100, 60, -1250],
            [4700, 5, -1560],
          ],
          "91-eastport-quay": [
            [4845, g(4845, -1700) + 1.7, -1700],
            [4830, 3, -1450],
          ],
          "92-eastport-street": at("eastport", -60, 40, 1.7, 120, -20, 3),
        }
      : {}),
    "93-old-dam-from-the-air": (() => {
      const d = m.bridges.find((b) => b.id === "old-dam");
      const mx = (d.a[0] + d.b[0]) / 2,
        mz = (d.a[1] + d.b[1]) / 2;
      return [
        [mx + 250, 260, mz + 520],
        [mx, 40, mz - 60],
      ];
    })(),
    "94-old-dam-downstream": (() => {
      const d = m.bridges.find((b) => b.id === "old-dam");
      const mx = d.a[0] + (d.b[0] - d.a[0]) * 0.2,
        mz = d.a[1] + (d.b[1] - d.a[1]) * 0.2;
      return [
        [mx + 60, 55, mz - 260],
        [mx, 45, mz],
      ];
    })(),
    "95-iron-peaks-from-the-south-east": at("iron-peaks", 2600, 2200, 260, 300, 0, 260),
    "96-pine-ridge-rock-band": at("pine-ridge", -300, 900, 40, -500, 300, 60),
    "97-north-coast-headlands": at("iron-peaks", 2600, 600, 120, 2300, -500, 40),
    // The estates and the south-west coast (owner, 2026-11-11).
    "98-murder-cabins-villa": [
      [-2195, g(-2195, 1640) + 14, 1640],
      [-2230, g(-2230, 1600) + 3, 1600],
    ],
    "99-yacht-at-fishers-cove": [
      [-3700, 14, 3470],
      [-3733, 3, 3415],
    ],
    "100-yacht-aft-deck": [
      [-3733, 2.6, 3402],
      [-3733, 2.6, 3420],
    ],
    "101-west-beach": [
      [-4880, 8, 1520],
      [-4800, 1, 1700],
    ],
    "102-hospital-hill-mansion": [
      [3440, g(3440, -1900) + 16, -1900],
      [3490, g(3490, -1855) + 3, -1855],
    ],
    "103-hospital-retail-park": [
      [3120, g(3120, -1340) + 22, -1340],
      [3195, g(3195, -1280), -1280],
    ],
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
    // Iron Peaks audit (owner, 2026-11-04): the massif from the south, a climber halfway up,
    // and the view a sniper gets from a summit rim.
    "40-iron-peaks-from-the-south": at("iron-peaks", 150, 1500, 260, 0, -100, 200),
    // Relief check (2026-11-10): the massif from 900 m and from 3 km.
    "42-iron-peaks-from-900-m": at("iron-peaks", 250, 900, 90, 0, 0, 200),
    "43-iron-peaks-from-3-km": at("iron-peaks", 300, 3000, 60, 0, 0, 150),
    "41-climbing-iron-peaks": (() => {
      const p = m.perches?.[1];
      if (!p)
        return [
          [0, 500, 0],
          [0, 0, -4000],
        ];
      const x = p.x + 40,
        z = p.z + 190;
      return [
        [x, g(x, z) + 1.7, z],
        [p.x, p.y + 10, p.z],
      ];
    })(),
    "42-sniper-rim-over-pine-ridge": (() => {
      const p = m.perches?.[1];
      if (!p)
        return [
          [0, 500, 0],
          [0, 0, -4000],
        ];
      const x = p.x,
        z = p.z + 14;
      const r = poi("pine-ridge");
      return [
        [x, g(x, z) + 1.7, z],
        [r.x, g(r.x, r.z), r.z],
      ];
    })(),
    // Under the canopy (owner's H1Z1 reference, 2026-11-05): 300 m up, looking ahead and down
    // over the valleys toward the mountains, as a parachuting player sees the island.
    "43-canopy-view": at("crossroads", 600, 1800, 320, -200, -2600, 0),
    "44-canopy-view-north": at("pine-ridge", -400, 1400, 300, 200, -1200, 0),
    // Across the whole island (owner, 2026-11-05: every forest the same quality): the four
    // quarters from canopy height, and a forest edge on foot.
    "45-canopy-northwest": [
      [-2600, 280, -1200],
      [-3400, 0, -3600],
    ],
    "46-canopy-northeast": [
      [2600, 280, -1200],
      [3400, 0, -3600],
    ],
    "47-canopy-southwest": [
      [-2400, 280, 1400],
      [-3400, 0, 3600],
    ],
    // Ground and water close up (owner, 2026-11-05): a lake and its banks from 120 m, a bank
    // on foot, and a sea beach.
    ...(() => {
      const lake = m.waterBodies.find((w) => w.id === "lake-3") ?? m.waterBodies[0];
      const [x0, z0, x1, z1] = lake.bounds;
      const cx = (x0 + x1) / 2;
      const shoreZ = (() => {
        // Walk south from the lake's centre until the ground rises out of the water.
        for (let z = (z0 + z1) / 2; z < z1 + 400; z += 4) if (g(cx, z) > lake.level + 1.5) return z;
        return z1;
      })();
      return {
        "49-lake-from-120m": [
          [cx, lake.level + 120, z1 + 260],
          [cx, lake.level, (z0 + z1) / 2],
        ],
        "50-lake-bank": [eye(cx, shoreZ + 14, 1.7), [cx - 60, lake.level, shoreZ - 120]],
      };
    })(),
    // Neighbourhoods (owner, 2026-11-05: like H1Z1's fenced house lots): a housing block from
    // 45 m and a residential street on foot, in Northstar and Riverwood.
    "52-northstar-lots-from-45m": at("northstar-town", -330, 190, 45, -260, 120, 0),
    "53-northstar-residential-street": at("northstar-town", -300, 230, 1.7, -200, 160, 1.5),
    "54-riverwood-lots-from-45m": at("riverwood", 160, 140, 45, 90, 80, 0),
    "51-sea-beach": (() => {
      // South coast: the first land north of the sea along x = 0.
      let z = 4990;
      while (z > 0 && g(0, z) < 1) z -= 5;
      return [eye(0, z - 25, 1.7), [120, 0, z + 200]];
    })(),
    "48-canopy-southeast": [
      [2400, 280, 1400],
      [3400, 0, 3600],
    ],
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
// VIEWS=4,9,12 captures only the views whose names start with those numbers.
const only = process.env.VIEWS?.split(",");
for (const [name, [pos, look]] of Object.entries(views)) {
  if (only && !only.some((v) => name.startsWith(`${v}-`))) continue;
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
