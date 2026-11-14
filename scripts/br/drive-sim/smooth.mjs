/**
 * Driving smoothness check (headless Chromium, the real client against the in-page match): the
 * camera's place is recorded every frame while a vehicle is driven flat out along the runway,
 * and on foot at a sprint for comparison. A smooth view moves by speed × frame time every
 * frame; what is reported is how far each frame's move is from that (m), along the way and
 * vertically: jumps are what the driver sees as the trees and the ground shifting.
 *
 *   node scripts/br/drive-sim/smooth.mjs [--net=45] [--kind=sedan] [--json=out.json]
 *
 * --net=<ms>: the room's input queue behind a connection whose packets arrive up to <ms> late
 * each way (entry.tsx ?net). Without it the in-page match takes inputs as they come.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const net = arg("net"),
  kind = arg("kind") ?? "sedan";
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/drive-sim/entry.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    alias: { "@": path.join(ROOT, "src") },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  })
).outputFiles[0].text;
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}#game{position:absolute;inset:0}#hud{display:none}</style><div id=game></div><div id=hud></div><script type=module src=/sim.js></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/sim.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
// A small view: the software renderer's frame rate is what limits the trace's resolution.
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/${net ? `?net=${net}` : ""}`, {
  waitUntil: "domcontentloaded",
});
await page.waitForFunction(() => window.sim?.ready, null, { timeout: 180000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(5000);
await page.evaluate(() => window.sim.noDraw());
await wait(1000);

/** How far each frame's move is from speed × frame time. */
function analyse(rows) {
  const first = rows[0],
    last = rows[rows.length - 1];
  const span = Math.hypot(last[1] - first[1], last[3] - first[3]) || 1;
  const ux = (last[1] - first[1]) / span,
    uz = (last[3] - first[3]) / span;
  const steps = [];
  for (let i = 1; i < rows.length; i++) {
    const dt = (rows[i][0] - rows[i - 1][0]) / 1000;
    if (dt <= 0) continue;
    steps.push({
      dt,
      along: (rows[i][1] - rows[i - 1][1]) * ux + (rows[i][3] - rows[i - 1][3]) * uz,
      across: -(rows[i][1] - rows[i - 1][1]) * uz + (rows[i][3] - rows[i - 1][3]) * ux,
      up: rows[i][2] - rows[i - 1][2],
    });
  }
  // The speed at each frame: the median over the frames around it.
  const res = steps.map((s, i) => {
    const near = steps
      .slice(Math.max(0, i - 12), i + 13)
      .map((n) => n.along / n.dt)
      .sort((a, b) => a - b);
    const v = near[near.length >> 1];
    return s.along - v * s.dt;
  });
  const abs = res.map(Math.abs).sort((a, b) => a - b);
  const q = (p) => abs[Math.min(abs.length - 1, Math.floor(abs.length * p))];
  const seconds = (last[0] - first[0]) / 1000;
  return {
    frames: rows.length,
    fps: +(rows.length / seconds).toFixed(1),
    speed: +(span / seconds).toFixed(1),
    alongP50: +q(0.5).toFixed(3),
    alongP95: +q(0.95).toFixed(3),
    alongMax: +abs[abs.length - 1].toFixed(3),
    jumpsOver20cm: +(res.filter((r) => Math.abs(r) > 0.2).length / seconds).toFixed(2),
    jumpsOver50cm: +(res.filter((r) => Math.abs(r) > 0.5).length / seconds).toFixed(2),
    acrossMax: +Math.max(...steps.map((s) => Math.abs(s.across))).toFixed(3),
    upMax: +Math.max(...steps.map((s) => Math.abs(s.up))).toFixed(3),
  };
}

/** The client's own work per frame (ms, drawing excluded): what a hitch is made of. */
function work(ms) {
  const s = [...ms].sort((a, b) => a - b);
  const q = (p) => +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2);
  return {
    p50: q(0.5),
    p95: q(0.95),
    p99: q(0.99),
    max: +s[s.length - 1].toFixed(2),
    over8ms: ms.filter((m) => m > 8).length,
    over16ms: ms.filter((m) => m > 16).length,
  };
}
const out = { net: net ? Number(net) : null, kind };
// On foot, sprinting along the runway.
await page.evaluate(() => window.sim.look(window.sim.yaw, -0.05));
await page.keyboard.down("ShiftLeft");
await page.keyboard.down("KeyW");
await wait(2500);
out.sprint = analyse(await page.evaluate(() => window.sim.trace(6000)));
out.sprintWork = work(await page.evaluate(() => window.sim.work(6000)));
await page.keyboard.up("KeyW");
await page.keyboard.up("ShiftLeft");
await wait(800);
// Driving, flat out.
await page.evaluate((k) => window.sim.toVehicle(k), kind);
await wait(1500);
await page.keyboard.press("KeyE");
await wait(3000);
await page.keyboard.down("KeyW");
await wait(9000);
const rows = await page.evaluate(() => window.sim.trace(7000));
out.drive = analyse(rows);
out.driveWork = work(await page.evaluate(() => window.sim.work(7000)));
await page.keyboard.up("KeyW");
console.log(JSON.stringify(out, null, 1));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ ...out, rows }));
await browser.close();
server.close();
