/**
 * IRON DISTRICT in the real Bomb Defusal client (headless Chromium, SwiftShader): mounts the map
 * through the shipped renderer with an in-page room, then
 *   1. first-person views as a Police player and as a Terrorist (spawn, sites, mid, tunnel, ...),
 *      with the renderer's draw statistics per view;
 *   2. a full plant on A and on B by a Terrorist holding use (the room decides), and a full defuse
 *      by a Police player;
 *   3. walking the tunnel stairs and the apartment stairs with the client's own prediction.
 * Screenshots and report.json go to <outDir>.
 *
 *   node scripts/fps/bomb-harness/iron.mjs <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "iron-harness-out";
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({
  entryPoints: [path.join(ROOT, "scripts/fps/bomb-harness/entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  loader: { ".webp": "empty", ".png": "empty", ".css": "empty" },
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "error",
});
const js = bundle.outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0;background:#000'><script type=module src='/h.js'></script></body></html>",
    );
  if (url === "/h.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (
    !file.startsWith(path.join(ROOT, "public")) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": file.endsWith(".glb") ? "model/gltf-binary" : "application/octet-stream",
  });
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
const report = {};
const shot = (page, name) =>
  page.screenshot({
    path: path.join(outDir, `${name}.jpg`),
    quality: 82,
    type: "jpeg",
    timeout: 300_000,
  });
const frames = async (page, n) => {
  const start = await page.evaluate(() => window.harness.diagnostics().renderFrames);
  await page.waitForFunction((s) => window.harness.diagnostics().renderFrames >= s, start + n, {
    timeout: 240_000,
  });
};
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

async function session(slot, views) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => !!window.harness, null, { timeout: 60_000 });
  const load = await page.evaluate((s) => window.harness.start(s, "iron-district"), slot);
  await page.evaluate(() => {
    window.harness.freezeBots(true);
    window.harness.live();
    // Bots out of the way (they would walk into the views).
    for (let i = 0; i < 10; i++) window.harness.set(i, { x: 0, y: 1.2, z: -44.5 });
  });
  const out = { load, views: {} };
  for (const [name, p] of Object.entries(views)) {
    await page.evaluate(
      ([s, v]) =>
        window.harness.set(s, { x: v[0], y: v[1], z: v[2], yaw: v[3], pitch: v[4], velocityY: 0 }),
      [slot, p],
    );
    // The client steers its own view (its inputs carry the yaw): turn it to the wanted heading.
    await frames(page, 3);
    await page.evaluate(
      ([s, v]) => {
        const cur = window.harness.view()?.self.yaw ?? window.harness.state().players[s].yaw;
        const d = Math.atan2(Math.sin(v[3] - cur), Math.cos(v[3] - cur));
        window.harness.turn(d);
      },
      [slot, p],
    );
    await frames(page, 6);
    await page.evaluate(
      ([s, v]) => window.harness.set(s, { x: v[0], y: v[1], z: v[2], velocityY: 0 }),
      [slot, p],
    );
    await frames(page, 4);
    await settle(200);
    await shot(page, `${slot < 5 ? "police" : "terrorist"}-${name}`);
    out.views[name] = await page.evaluate(() => {
      const d = window.harness.diagnostics();
      return { calls: d.drawCalls ?? d.calls, triangles: d.triangles, frameMs: d.frameMs };
    });
  }
  return { page, out };
}

// 1. Police (slot 0) and Terrorist (slot 5) first-person views.
const police = await session(0, {
  ctSpawn: [0, 1.2, -41.5, 3.1416, 0],
  aGate: [-30.5, 1.2, -39.5, 2.6, -0.02],
  aCatwalk: [-24.5, 4.2, -34.8, 2.65, -0.12],
  marketHall: [32, 2.4, -42, 3.1416, 0],
  bWindow: [26.5, 2.4, -39.6, 3.1416, -0.04],
  ctMid: [3, 1.2, -24, 3.1416, 0],
});
report.police = police.out;
// One page at a time: a second headless page is throttled while the first one renders.
await police.page.close();
const terror = await session(5, {
  tSpawn: [0, 5.4, 42, 0, 0],
  aDoors: [-35.5, 1.2, -9.5, 0, -0.02],
  tunnel: [-12.5, 0, 19.5, -1.5708, 0],
  tunnelExit: [13.5, 0.2, 13, 0, 0.05],
  midSteps: [-6.5, 5.4, 15.5, -0.38, -0.12],
  balcony: [26, 5.4, -11.2, 0, -0.2],
  arch: [37, 2.4, -7, 0.3, -0.02],
  loadingRamp: [-33, 5.4, 31, 0, -0.1],
});
report.terrorist = terror.out;

// 2. Plant on A and on B (the Terrorist holds use; the room plants), then a Police defuse.
const tp = terror.page;
async function plantAt(site, at) {
  return tp.evaluate(
    async ([site, at]) => {
      const h = window.harness;
      const st = h.state();
      st.bomb = { state: "carried", carrier: 5 };
      h.set(5, { x: at[0], y: at[1], z: at[2], velocityY: 0, hp: 100 });
      h.use(5, true);
      const t0 = Date.now();
      while (Date.now() - t0 < 6000 && h.state().bomb.state !== "planted")
        await new Promise((r) => setTimeout(r, 100));
      h.use(5, false);
      const b = h.state().bomb;
      return { site, state: b.state, plantedSite: b.site ?? null, ms: Date.now() - t0 };
    },
    [site, at],
  );
}
report.plantA = await plantAt("A", [-30, 1.2, -33]);
await shot(tp, "terrorist-planted-A");
report.plantB = await plantAt("B", [26, 2.4, -27]);
await shot(tp, "terrorist-planted-B");
// Defuse at B with slot 0 (Police) standing at the bomb.
report.defuse = await tp.evaluate(async () => {
  const h = window.harness;
  const b = h.state().bomb;
  h.state().bomb.explodesAt = Date.now() + 60_000;
  h.set(0, { x: b.x + 0.3, y: b.y, z: b.z, velocityY: 0, hp: 100 });
  h.use(0, true);
  const t0 = Date.now();
  while (Date.now() - t0 < 14000 && h.state().bomb.state === "planted")
    await new Promise((r) => setTimeout(r, 100));
  h.use(0, false);
  return { state: h.state().bomb.state, ms: Date.now() - t0 };
});

// 3. The client's own prediction walking the tunnel stairs down and the apartment stairs up.
const pp = terror.page;
async function walk(from, yaw, keyMs) {
  await pp.evaluate(
    ([f, yaw]) =>
      window.harness.set(5, { x: f[0], y: f[1], z: f[2], yaw, pitch: 0, velocityY: 0, hp: 100 }),
    [from, yaw],
  );
  await frames(pp, 3);
  await pp.evaluate(() => window.harness.key("KeyW", true));
  await settle(keyMs);
  await pp.evaluate(() => window.harness.key("KeyW", false));
  await frames(pp, 4);
  return pp.evaluate(() => {
    const p = window.harness.state().players[5];
    return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) };
  });
}
// The defuse ended the round: skip to the next live phase before walking.
await pp.waitForFunction(
  () => {
    window.harness.live();
    return window.harness.state().phase === "live";
  },
  null,
  { timeout: 120_000, polling: 500 },
);
await frames(pp, 4);
report.walkTunnelStairs = await walk([-14.5, 5.4, 31.5], 0, 6000);
await shot(pp, "terrorist-walked-tunnel-stairs");
report.walkApartmentStairs = await walk([30, 2.4, -1.5], Math.PI, 5000);
await shot(pp, "terrorist-walked-apartment-stairs");
report.errors = await tp.evaluate(() => window.harness.errors);
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
await browser.close();
server.close();
