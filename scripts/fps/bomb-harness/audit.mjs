/**
 * Bomb Defusal client check in headless Chromium (SwiftShader WebGL2): loads the real renderer
 * with an in-page room, then walks through freeze → live movement → an enemy in view →
 * death and teammate spectating → a planted bomb, saving screenshots and draw statistics.
 *
 *   node scripts/fps/bomb-harness/run.mjs <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "bomb-harness-out";
// Render audit: draw cost with 0, 4 and 9 operators in view (real map, real renderer).
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
const types = {
  ".glb": "model/gltf-binary",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ktx2": "image/ktx2",
  ".wasm": "application/wasm",
};
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
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
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
const page = await browser.newPage({
  viewport: { width: Number(process.env.W ?? 800), height: Number(process.env.H ?? 450) },
});
const missing = new Set();
page.on("response", (r) => r.status() === 404 && missing.add(new URL(r.url()).pathname));
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.harness === "object");
const wait = (ms) => page.waitForTimeout(ms);
// SwiftShader renders this scene at a few frames per second, and the renderer sends inputs from
// its frame loop: wait on rendered frames / sent inputs, never on wall time.
const frames = async (n) => {
  const start = await page.evaluate(() => window.harness.diagnostics().renderFrames);
  await page.waitForFunction((s) => window.harness.diagnostics().renderFrames >= s, start + n, {
    timeout: 120000,
  });
};
const inputs = async (n) => {
  const start = await page.evaluate(() => window.harness.sent().sent);
  await page.waitForFunction((s) => window.harness.sent().sent >= s, start + n, {
    timeout: 120000,
  });
};
const shot = (name) =>
  page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 80, type: "jpeg" });
const report = { checks: {} };
const check = (name, ok, detail) => {
  report.checks[name] = { ok: !!ok, ...(detail === undefined ? {} : { detail }) };
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}`,
    detail === undefined ? "" : JSON.stringify(detail),
  );
};

report.load = await page.evaluate(() => window.harness.start(0));
const readyPrograms = new Set(await page.evaluate(() => window.harness.programs()));
await page.evaluate(() => {
  window.harness.freezeBots(true);
  window.harness.live();
});
await inputs(5);
// Stand in the mid plaza looking north (+z is south; yaw 0 looks toward -z): place operators ahead.
const scene = async (name, count) => {
  await page.evaluate((count) => {
    const h = window.harness;
    h.state().roundEndsAt = Date.now() + 3_600_000;
    // Mid plaza (open, x -10..10, z -14..2), looking south (+z, yaw π) across it.
    h.set(0, { x: 0, y: 0, z: -13, yaw: Math.PI, pitch: 0, velocityY: 0, hp: 100, dead: false });
    for (let s = 1; s < 10; s++) {
      const k = s - 1;
      if (k < count)
        h.set(s, {
          x: ((k % 3) - 1) * 3,
          y: 0,
          z: -9 + Math.floor(k / 3) * 3.5,
          yaw: 0,
          hp: 100,
          dead: false,
        });
      // Out of view: behind the camera in the Police mid corridor.
      else h.set(s, { x: 5, y: 0, z: -18 - k * 1.5, hp: 100, dead: false });
    }
  }, count);
  await inputs(12);
  await frames(4);
  const samples = [];
  for (let i = 0; i < 4; i++) {
    await frames(1);
    samples.push(await page.evaluate(() => window.harness.diagnostics()));
  }
  const d = samples.at(-1);
  report[name] = {
    operatorsDrawn: d.visibleActors,
    calls: d.calls,
    triangles: d.triangles,
    geometries: d.geometries,
    textures: d.textures,
    programs: d.programs,
    phase: await page.evaluate(() => window.harness.state().phase),
    camera: d.camera.map((v) => +v.toFixed(2)),
    me: await page.evaluate(() => {
      const p = window.harness.state().players[0];
      return [+p.x.toFixed(2), +p.z.toFixed(2), p.hp];
    }),
    cpuMsAvg: +(samples.reduce((a, s) => a + s.cpuMs, 0) / samples.length).toFixed(2),
    softwareFrameMs: Math.round(samples.reduce((a, s) => a + s.frameMs, 0) / samples.length),
  };
  console.log(name, JSON.stringify(report[name]));
  await page.screenshot({ path: path.join(outDir, name + ".jpg"), quality: 80, type: "jpeg" });
};
await scene("operators-0", 0);
await scene("operators-4", 4);
await scene("operators-9", 9);
// JavaScript CPU profile of the frame loop with nine operators in view (bots running).
await page.evaluate(() => window.harness.freezeBots(false));
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
await cdp.send("Profiler.start");
await frames(Number(process.env.PROFILE_FRAMES ?? 12));
const { profile } = await cdp.send("Profiler.stop");
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
let total = 0;
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const k = `${n.callFrame.functionName || "(anonymous)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`;
  const dt = profile.timeDeltas[i] ?? 0;
  self.set(k, (self.get(k) ?? 0) + dt);
  total += dt;
});
report.profile = [...self]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .map(([k, v]) => `${((100 * v) / total).toFixed(1)}% ${k}`);
console.log(report.profile.join("\n"));
// The objective visuals: a planted bomb in view, then its explosion.
await page.evaluate(() => {
  const h = window.harness;
  h.freezeBots(true);
  const t = Date.now();
  h.state().bomb = {
    state: "planted",
    x: 0,
    y: 0,
    z: -9,
    site: "A",
    plantedAt: t,
    explodesAt: t + 4000,
  };
});
await inputs(10);
await frames(3);
await page.screenshot({ path: path.join(outDir, "bomb-planted.jpg"), quality: 80, type: "jpeg" });
await page.waitForFunction(
  () => window.harness.state().bomb.state === "exploded" || window.harness.state().phase !== "live",
  null,
  { timeout: 120000, polling: 100 },
);
console.log(
  "after plant:",
  JSON.stringify(
    await page.evaluate(() => ({
      b: window.harness.state().bomb.state,
      phase: window.harness.state().phase,
      last: window.harness.state().lastRound,
    })),
  ),
);
await frames(3);
await page.screenshot({ path: path.join(outDir, "bomb-exploded.jpg"), quality: 80, type: "jpeg" });
report.compiledAfterReady = (await page.evaluate(() => window.harness.programs())).filter(
  (p) => !readyPrograms.has(p),
);
console.log("compiled after Ready:", report.compiledAfterReady.length);
for (const p of report.compiledAfterReady) {
  const [name, key] = p.split("|");
  const flags = key
    .split(",")
    .filter((f) => /^(true|false)$/.test(f) === false)
    .slice(0, 12)
    .join(",");
  console.log("  ", name, "::", key.length, flags.slice(0, 300));
  for (const r of readyPrograms) {
    const [rn, rk] = r.split("|");
    if (rn !== name) continue;
    const a = key.split(","),
      b = rk.split(",");
    const diff = a.map((v, i) => (v !== b[i] ? `${i}:${b[i]}→${v}` : null)).filter(Boolean);
    console.log("      vs ready:", diff.slice(0, 12).join(" "));
  }
}
report.missing = [...missing];
report.consoleErrors = consoleErrors.filter((e) => !/favicon|404|status of 404/.test(e));
fs.writeFileSync(path.join(outDir, "audit.json"), JSON.stringify(report, null, 1));
console.log("errors", report.consoleErrors.length, "missing", report.missing);
await browser.close();
server.close();
