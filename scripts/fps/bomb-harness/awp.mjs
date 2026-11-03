/**
 * AWP client check (5v5) in headless Chromium: the real Bomb Defusal renderer and an in-page
 * room. Buys the AWP at spawn, zooms with right mouse (lens, 4× camera), fires one shot through
 * the zoom at an enemy (one-shot kill), checks the bolt cycle gate, reloads, and reports draw
 * cost and any shader compiled after Ready. Screenshots of each step.
 *
 *   node scripts/fps/bomb-harness/awp.mjs <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "awp-harness-out";
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
// The HUD's scope overlay (BuyMenu's stylesheet) next to the canvas host, as in the game.
await page.addStyleTag({
  content: fs.readFileSync(path.join(ROOT, "src/components/fps/buy-menu.css"), "utf8"),
});
await page.evaluate(() => {
  const lens = document.createElement("div");
  lens.className = "awp-scope";
  lens.innerHTML = '<i class="h"></i><i class="v"></i>';
  document.body.appendChild(lens);
});
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
const programsAtReady = await page.evaluate(() => window.harness.programs());
// Live round (its clock pushed out for SwiftShader), still at spawn: buy the AWP (spawn buy menu →
// the room's rule: first 20 s, within 7 m of the spawn).
await page.evaluate(() => {
  window.harness.freezeBots(true);
  window.harness.live();
});
await inputs(10);
const bought = await page.evaluate(() => window.harness.buy("awp"));
await inputs(6);
await frames(4);
const self0 = await page.evaluate(() => window.harness.view().self);
check("AWP bought at spawn", bought && self0.primary === "awp", {
  ammo: self0.ammo,
  reserve: self0.reserve,
});
check("5 / 30 rounds", self0.ammo === 5 && self0.reserve === 30);
// Let the draw animation finish (0.95 s) before the screenshot.
await frames(6);
await inputs(30);
await frames(3);
await shot("1-awp-idle");

// An enemy 20 m ahead in the open, facing us.
await page.evaluate(() => {
  const h = window.harness;
  h.set(0, { x: 4, y: 0, z: -24, velocityY: 0, pitch: 0 });
  const yaw = h.view().self.yaw;
  for (const s of [5, 6, 7, 8, 9]) h.set(s, { x: 30, z: 30 });
  h.set(5, {
    x: 4 - Math.sin(yaw) * 20,
    y: 0,
    z: -24 - Math.cos(yaw) * 20,
    yaw: yaw + Math.PI,
    armor: 100,
  });
});
await inputs(10);
await frames(2);
// Right mouse: zoom.
await page.evaluate(() => {
  window.harness.mouse(2, true);
  window.harness.mouse(2, false);
});
await inputs(20);
await frames(4);
const zoom = await page.evaluate(() => ({
  self: window.harness.state().players[0],
  lens: document.querySelector(".awp-scope")?.classList.contains("is-on"),
  d: window.harness.diagnostics(),
}));
await shot("2-awp-scoped");
check("room applied the zoom (input.scope)", !!zoom.self.scoped);
check("lens overlay shown", !!zoom.lens);
// Aim at the chest: the camera looks level from eye height; the chest is ~0.45 m below.
const aim = await page.evaluate(() => {
  const h = window.harness;
  const s = h.state().players[0],
    e = h.state().players[5];
  const dx = e.x - s.x,
    dz = e.z - s.z,
    d = Math.hypot(dx, dz);
  return { d, pitch: Math.atan2(1.2 - 1.62, d) };
});
// Mouse deltas → pitch (renderer: pitch -= movementY · sensitivity · ¼ zoomed).
await page.evaluate((pitch) => {
  const h = window.harness;
  const v = h.view().self;
  const want = pitch - v.pitch;
  // HANDLING.sensitivity is 0.002 rad per count; zoomed sensitivity ×¼.
  h.look(0, -want / (0.002 * 0.25));
}, aim.pitch);
await inputs(20);
await frames(2);
const hpBefore = await page.evaluate(() => window.harness.state().players[5].hp);
await page.evaluate(() => {
  window.harness.mouse(0, true);
  window.harness.mouse(0, false);
});
await inputs(8);
await frames(2);
await shot("3-awp-shot");
const afterShot = await page.evaluate(() => ({
  self: window.harness.state().players[0],
  enemy: window.harness.state().players[5],
}));
check("one shot fired (5 → 4)", afterShot.self.ammo === 4, afterShot.self.ammo);
// SwiftShader is slow: the zoom may already be back, but never before the bolt has cycled.
const firstShotAt = afterShot.self.lastShotAt;
check(
  "shot unzoomed the rifle until the bolt cycled",
  !afterShot.self.scoped || afterShot.self.scopedAt - firstShotAt >= 1463,
  { scopedAt: afterShot.self.scopedAt, lastShotAt: firstShotAt },
);
check("one scoped body shot kills through a vest", hpBefore > 0 && afterShot.enemy.hp <= 0, {
  hpBefore,
  hpAfter: afterShot.enemy.hp,
  distance: +aim.d.toFixed(1),
});
// Bolt: a second click inside 1.463 s is refused.
await page.evaluate(() => {
  window.harness.mouse(0, true);
  window.harness.mouse(0, false);
});
await inputs(6);
await frames(2);
await shot("4-awp-bolt");
const cycling = await page.evaluate(() => window.harness.state().players[0]);
check(
  "bolt cycle gates the next shot (≥ 1.463 s apart)",
  cycling.ammo === 4 || cycling.lastShotAt - firstShotAt >= 1463,
  { ammo: cycling.ammo, gap: cycling.lastShotAt - firstShotAt },
);
// After the cycle the zoom comes back by itself (wish still held).
await inputs(50);
await frames(3);
const resumed = await page.evaluate(() => window.harness.state().players[0]);
check("zoom resumes after the bolt", !!resumed.scoped);
// Reload (R): 3.67 s, then 5 / 25.
await page.evaluate(() => {
  window.harness.key("KeyR", true);
});
await inputs(4);
await page.evaluate(() => window.harness.key("KeyR", false));
await inputs(20);
await frames(3);
await shot("5-awp-reload");
const reloading = await page.evaluate(() => window.harness.state().players[0]);
check("reload unzooms", !reloading.scoped, { reloadUntil: reloading.reloadUntil });
const roundsBefore = cycling.ammo + cycling.reserve;
await inputs(115);
await frames(2);
const reloaded = await page.evaluate(() => window.harness.state().players[0]);
check(
  "reloaded a full 5-round magazine from the reserve, zoom stays off",
  reloaded.ammo === 5 && reloaded.ammo + reloaded.reserve === roundsBefore && !reloaded.scoped,
  { ammo: reloaded.ammo, reserve: reloaded.reserve },
);
// Back to the side's rifle from the buy menu (back at the spawn, inside the buy time).
await page.evaluate(([x, z]) => window.harness.set(0, { x, z }), [self0.x, self0.z]);
const rifleBack = await page.evaluate(() => window.harness.buy("rifle"));
await inputs(10);
await frames(3);
const back = await page.evaluate(() => window.harness.view().self);
check("re-buy the side rifle", rifleBack && back.primary === undefined && back.ammo === 30);
const programsAfter = await page.evaluate(() => window.harness.programs());
check("no shader compiled after Ready", programsAfter.length === programsAtReady.length, {
  programsAtReady: programsAtReady.length,
  late: programsAfter.filter((p) => !programsAtReady.includes(p)).map((p) => p.slice(0, 160)),
});
report.final = await page.evaluate(() => window.harness.diagnostics());
report.missing = [...missing];
report.consoleErrors = consoleErrors.filter((e) => !/favicon|404|status of 404/.test(e));
check("no page errors", report.consoleErrors.length === 0, report.consoleErrors.slice(0, 5));
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
await browser.close();
server.close();
process.exit(Object.values(report.checks).every((c) => c.ok) ? 0 : 1);
