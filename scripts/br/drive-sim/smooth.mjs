/**
 * Driving smoothness check (headless Chromium, the real client against the in-page match): the
 * camera's place is recorded every frame while a vehicle is driven flat out along the runway,
 * and on foot at a sprint for comparison. A smooth view moves by speed × frame time every
 * frame; what is reported is how far each frame's move is from that (m), along the way and
 * vertically: jumps are what the driver sees as the trees and the ground shifting.
 *
 *   node scripts/br/drive-sim/smooth.mjs [--net=45] [--kind=sedan] [--json=out.json]
 *     [--line=ax,az,bx,bz]
 *
 * --line: drive along this line (a road) instead of the level runway: real ground under the
 * wheels, so the report's `vertical` (how hard the view is jolted up and down, m/s² and rad/s²
 * of the camera's height and pitch) means something. The free look is then swung to the side
 * and let go, and how the view turns is reported as `look`.
 *
 * --walk=<seconds> (with --line): no drive; sprint along the line for that long, then turn all
 * the way round, and report the client's own work per frame for each (`walkWork`, `turnWork`):
 * where a place's lag spikes are looked for (a street in Downtown).
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
  kind = arg("kind") ?? "sedan",
  line = arg("line");
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
const query = [net && `net=${net}`, line && `line=${line}&first=${kind}`, arg("walk") && "walk=1"]
  .filter(Boolean)
  .join("&");
await page.goto(`http://127.0.0.1:${server.address().port}/${query ? `?${query}` : ""}`, {
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

/**
 * How hard the view is jolted: the camera's vertical acceleration (m/s²) and the acceleration
 * of its pitch and heading (rad/s²), frame to frame. A view that rides the ground rigidly takes
 * every kink of it.
 */
function jolts(rows) {
  const v = [];
  for (let i = 1; i < rows.length; i++) {
    const dt = (rows[i][0] - rows[i - 1][0]) / 1000;
    if (dt <= 0) continue;
    const pitch = (r) => Math.asin(Math.max(-1, Math.min(1, r[5])));
    const yaw = (r) => Math.atan2(r[4], r[6]);
    const turn = yaw(rows[i]) - yaw(rows[i - 1]);
    v.push({
      dt,
      y: (rows[i][2] - rows[i - 1][2]) / dt,
      pitch: (pitch(rows[i]) - pitch(rows[i - 1])) / dt,
      yaw: Math.atan2(Math.sin(turn), Math.cos(turn)) / dt,
    });
  }
  const acc = (key) => {
    const a = [];
    for (let i = 1; i < v.length; i++) a.push(Math.abs(v[i][key] - v[i - 1][key]) / v[i].dt);
    a.sort((p, q) => p - q);
    const rms = Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
    return {
      rms: +rms.toFixed(2),
      p95: +a[Math.floor(a.length * 0.95)].toFixed(2),
      max: +a[a.length - 1].toFixed(2),
    };
  };
  return { height: acc("y"), pitch: acc("pitch"), heading: acc("yaw") };
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
// --profile=<file.cpuprofile>: the drive under the JS profiler, and where its time went.
const cdp = arg("profile") ? await page.context().newCDPSession(page) : null;
// On foot, sprinting along the runway (a road is for the drive: its queue of cars is in the way).
if (!line) {
  await page.evaluate(() => window.sim.look(window.sim.yaw, -0.05));
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await wait(2500);
  out.sprint = analyse(await page.evaluate(() => window.sim.trace(6000)));
  out.sprintWork = work(await page.evaluate(() => window.sim.work(6000)));
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  await wait(800);
}
// (The tactical map's picture is drawn in the first seconds of a match, without its worker in
// this harness: let it finish, as the sprint above does for the runway.)
if (line) await wait(14000);
/** The JS profile's functions by their own time (ms), most first. */
async function profiled() {
  const { profile } = await cdp.send("Profiler.stop");
  fs.writeFileSync(arg("profile"), JSON.stringify(profile));
  const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => {
    const f = byId.get(id).callFrame;
    const key = `${f.functionName || "(anonymous)"} :${f.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000);
  });
  return [...self]
    .filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([k, ms]) => `${ms.toFixed(0)} ms  ${k}`);
}
const profile = async () => {
  if (!cdp) return;
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
  await cdp.send("Profiler.start");
};
if (arg("walk")) {
  const ms = Number(arg("walk")) * 1000;
  await page.evaluate(() => window.sim.look(window.sim.yaw, -0.05));
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await wait(1500);
  await profile();
  out.walk = analyse(await page.evaluate((t) => window.sim.trace(t), ms));
  out.walkWork = work(await page.evaluate((t) => window.sim.work(t), ms));
  // All the way round in three seconds, still running.
  await page.evaluate((px) => window.sim.mouse(px, 3000), Number(arg("turn") ?? 2900));
  out.turnWork = work(await page.evaluate(() => window.sim.work(3000)));
  // What is recomposed every frame here: the visible scene roots that hold the most objects.
  out.roots = (await page.evaluate(() => window.sim.roots()))
    .filter((r) => r.visible && !r.own && r.objects > 20)
    .sort((a, b) => b.objects - a.objects)
    .slice(0, 12)
    .map((r) => `${r.objects} ${r.name}`);
  if (cdp) out.profile = await profiled();
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
  server.close();
  process.exit(0);
}
// Driving, flat out.
await page.evaluate((k) => window.sim.toVehicle(k), kind);
await wait(1500);
await page.keyboard.press("KeyE");
await wait(3000);
await profile();
await page.keyboard.down("KeyW");
await wait(line ? 3500 : 9000);
const rows = await page.evaluate((ms) => window.sim.trace(ms), line ? 5000 : 7000);
out.drive = analyse(rows);
out.vertical = jolts(rows);
out.driveWork = work(await page.evaluate(() => window.sim.work(5000)));
if (line) {
  // Free look at speed: swing the view to the side for a second (a steady mouse), then let go.
  const headingOf = (r) => Math.atan2(r[4], r[6]);
  const swing = page.evaluate(() => window.sim.trace(4500));
  await page.evaluate(() => window.sim.mouse(900, 1000));
  const look = await swing;
  const t0 = look[0][0],
    h0 = headingOf(look[0]);
  const off = look.map((r) => {
    const d = headingOf(r) - h0;
    return [r[0] - t0, Math.atan2(Math.sin(d), Math.cos(d))];
  });
  const at = (ms) => off.find((o) => o[0] >= ms) ?? off[off.length - 1];
  const peak = off.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
  out.look = {
    // How far the view had turned when the mouse stopped, and what was left of that later.
    peakDeg: +((peak[1] * 180) / Math.PI).toFixed(1),
    peakAtMs: Math.round(peak[0]),
    heldAfter500ms: +(at(1500)[1] / peak[1]).toFixed(2),
    heldAfter1500ms: +(at(2500)[1] / peak[1]).toFixed(2),
    heldAfter3000ms: +(at(4000)[1] / peak[1]).toFixed(2),
    jolts: jolts(look).heading,
  };
}
await page.keyboard.up("KeyW");
if (cdp) out.profile = await profiled();
console.log(JSON.stringify(out, null, 1));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ ...out, rows }));
await browser.close();
server.close();
