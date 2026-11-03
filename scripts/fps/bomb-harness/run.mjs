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
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "bomb-harness-out";
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
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
await frames(3);
await shot("1-freeze-spawn");
const freeze = await page.evaluate(() => ({
  v: window.harness.view(),
  d: window.harness.diagnostics(),
}));
check("round running at load", ["freeze", "live"].includes(freeze.v.phase), freeze.v.phase);
check("teammates drawn at spawn", freeze.d.visibleActors >= 1, freeze.d.visibleActors);
report.spawnDraw = {
  calls: freeze.d.calls,
  triangles: freeze.d.triangles,
  frameMs: freeze.d.frameMs,
};
console.log("spawn draw", JSON.stringify(report.spawnDraw));

// Live: hold W for one second with the bots held still.
await page.evaluate(() => {
  window.harness.freezeBots(true);
  window.harness.live();
});
await inputs(10);
const before = await page.evaluate(() => window.harness.state().players[0]);
await page.evaluate(() => window.harness.key("KeyW", true));
await inputs(30); // 30 inputs = 1 s of movement
await page.evaluate(() => window.harness.key("KeyW", false));
await inputs(8);
await frames(2);
const after = await page.evaluate(() => ({
  p: window.harness.state().players[0],
  d: window.harness.diagnostics(),
}));
const moved = Math.hypot(after.p.x - before.x, after.p.z - before.z);
check("W for 30 inputs moves ≈5 m on the room", moved > 3.5 && moved < 6.5, +moved.toFixed(2));
const camErr = Math.hypot(after.d.camera[0] - after.p.x, after.d.camera[2] - after.p.z);
check("predicted camera matches the room position", camErr < 0.3, +camErr.toFixed(3));

// An enemy 8 m ahead in the open (mid), facing us.
const placed = await page.evaluate(() => {
  const h = window.harness;
  h.set(0, { x: 4, y: 0, z: -24, velocityY: 0 });
  const yaw = h.view().self.yaw;
  const ex = 4 - Math.sin(yaw) * 8,
    ez = -24 - Math.cos(yaw) * 8;
  for (const s of [5, 6, 7, 8, 9]) h.set(s, { x: 30, z: 30 });
  h.set(5, { x: ex, y: 0, z: ez, yaw: yaw + Math.PI });
  return { yaw, ex, ez };
});
await inputs(10);
await frames(3);
const enemy = await page.evaluate(() => ({
  v: window.harness.view(),
  d: window.harness.diagnostics(),
}));
await shot("2-enemy-in-view");
check("enemy revealed by the room", !!enemy.v.players[5].pose, placed);
check("enemy operator drawn", enemy.d.visibleActors >= 1, enemy.d.visibleActors);
report.midDraw = { calls: enemy.d.calls, triangles: enemy.d.triangles };

// Hide him behind a building: the room stops sending him; the renderer stops drawing him.
await page.evaluate(() => window.harness.set(5, { x: 30, z: 30 }));
await inputs(10);
await frames(2);
const hidden = await page.evaluate(() => window.harness.view().players[5].pose);
check("hidden enemy is not sent", hidden === undefined);

// Death → spectating a living teammate.
await page.evaluate(() => {
  const h = window.harness;
  h.set(1, { x: -2, y: 0, z: -20 });
  h.set(0, { hp: 0, dead: true });
});
await inputs(10);
await frames(3);
const spec = await page.evaluate(() => ({
  v: window.harness.view(),
  d: window.harness.diagnostics(),
  s: window.harness.state().players,
}));
await shot("3-spectating");
const watched = spec.v.spectating;
const camToMate =
  watched === null
    ? Infinity
    : Math.hypot(spec.d.camera[0] - spec.s[watched].x, spec.d.camera[2] - spec.s[watched].z);
check(
  "dead player watches a living teammate",
  watched !== null && spec.v.spectateTargets.includes(watched),
  watched,
);
check("camera is the teammate's eyes", camToMate < 0.6, +camToMate.toFixed(3));
await page.evaluate(() => window.harness.spectate(3));
await inputs(10);
await frames(2);
check(
  "can switch to another teammate",
  (await page.evaluate(() => window.harness.view().spectating)) === 3,
);

// Planted bomb seen by the spectated teammate.
await page.evaluate(() => {
  const h = window.harness;
  h.plant("A");
  h.set(3, { x: -27, y: 0, z: -30.5, yaw: Math.PI, pitch: -0.35 });
});
await inputs(10);
await frames(3);
const bombView = await page.evaluate(() => window.harness.view().bomb);
await shot("4-planted-bomb");
check(
  "planted bomb position revealed once seen",
  bombView.state === "planted" && bombView.x !== undefined,
  bombView,
);

report.final = await page.evaluate(() => window.harness.diagnostics());
report.missing = [...missing];
console.log("missing:", report.missing);
report.consoleErrors = consoleErrors.filter((e) => !/favicon|404|status of 404/.test(e));
check("no page errors", report.consoleErrors.length === 0, report.consoleErrors.slice(0, 5));
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
await browser.close();
server.close();
process.exit(Object.values(report.checks).every((c) => c.ok) ? 0 : 1);
