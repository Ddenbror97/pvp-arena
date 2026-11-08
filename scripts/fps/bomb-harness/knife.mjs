/**
 * Karambit in the real Bomb Defusal client (headless Chromium, SwiftShader), against the in-page
 * room: draws the knife (2), holds the idle, presses F for each inspect, swings both attacks and
 * runs a jump, saving first-person screenshots at set animation times. Both the wall clock and
 * the frame clock are held, so every screenshot lands on its exact moment however slowly the
 * software renderer draws. Also reports draw calls and shader programs before and after (nothing
 * may compile mid-round).
 *
 *   TEAM=police|terrorist W=1280 H=720 node scripts/fps/bomb-harness/knife.mjs <outDir> [--chromium=/path]
 *
 * SHORT=1 stops after the first inspect (other screen sizes).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "bomb-knife-out";
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ME = process.env.TEAM === "terrorist" ? 5 : 0;
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
  viewport: { width: Number(process.env.W ?? 1280), height: Number(process.env.H ?? 720) },
});
const pageErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") console.error("console:", m.text().slice(0, 300));
});
page.on("pageerror", (e) => {
  pageErrors.push(e.message);
  console.error("pageerror:", e.message);
});
// Held clocks: Date.now (room and renderer) and the frame clock (performance.now and the rAF
// timestamp), advanced together in fixed steps.
await page.addInitScript(() => {
  const realDate = Date.now.bind(Date),
    realPerf = performance.now.bind(performance),
    realRaf = window.requestAnimationFrame.bind(window);
  let date = null,
    perf = null;
  Date.now = () => date ?? realDate();
  performance.now = () => perf ?? realPerf();
  window.requestAnimationFrame = (cb) => realRaf(() => cb(perf ?? realPerf()));
  window.__clock = {
    hold: (d, p) => {
      date = d;
      perf = p;
    },
    now: () => [Date.now(), performance.now()],
  };
});
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.harness === "object");
const frames = async (n) => {
  const start = await page.evaluate(() => window.harness.diagnostics().renderFrames);
  await page.waitForFunction((s) => window.harness.diagnostics().renderFrames >= s, start + n, {
    timeout: 120_000,
  });
};
const report = { team: ME === 0 ? "police" : "terrorist", shots: {}, checks: {} };
const check = (name, ok, detail) => {
  report.checks[name] = { ok: !!ok, ...(detail === undefined ? {} : { detail }) };
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}`,
    detail === undefined ? "" : JSON.stringify(detail),
  );
};
console.log("starting", report.team);
report.load = await page.evaluate((me) => window.harness.start(me), ME);
console.log("loaded", JSON.stringify(report.load));
await page.evaluate((me) => {
  window.harness.freezeBots(true);
  window.harness.live();
  for (let i = 0; i < 10; i++) if (i !== me) window.harness.set(i, { x: 0, z: 70, hp: 100 });
}, ME);
await frames(3);
const programsAtReady = await page.evaluate(() => window.harness.programs());
let [date, perf] = await page.evaluate(() => window.__clock.now());
await page.evaluate(([d, p]) => window.__clock.hold(d, p), [date, perf]);
const STEP = 1000 / 30;
const advance = async (ms) => {
  for (let done = 0; done < ms - 1e-6; done += STEP) {
    date += STEP;
    perf += STEP;
    await page.evaluate(([d, p]) => window.__clock.hold(d, p), [date, perf]);
    await frames(1);
  }
};
const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 88, type: "jpeg" });
  const d = await page.evaluate(() => window.harness.diagnostics());
  report.shots[name] = { calls: d.calls, triangles: d.triangles, programs: d.programs };
  console.log("shot", name, d.calls, d.triangles);
};
const key = async (code) => {
  await page.evaluate((c) => window.harness.key(c, true), code);
  await advance(STEP);
  await page.evaluate((c) => window.harness.key(c, false), code);
};
await advance(400);
// Face the most open direction (the backdrop of the screenshots).
const open = await page.evaluate((me) => window.harness.openYaw(me), ME);
const current = await page.evaluate((me) => window.harness.state().players[me].yaw, ME);
await page.evaluate(
  (d) => window.harness.turn(d),
  Math.atan2(Math.sin(open - current), Math.cos(open - current)),
);
await advance(300);
await key("Digit2");
await advance(1500);
check(
  "the knife is drawn",
  (await page.evaluate((me) => window.harness.state().players[me].weapon, ME)) === "knife",
);
await shot("01-idle");
// F picks one of the two inspects at random (never the same twice running): press until the
// main one plays, then the other comes next.
const clip = () => page.evaluate(() => window.harness.diagnostics().knifeClip);
const inspect = async (want) => {
  for (let tries = 0; tries < 3; tries++) {
    await key("KeyF");
    const now = await clip();
    if (now?.name === want) return now;
    // The other one: let it finish, then press again.
    await advance(3600);
  }
  throw new Error(`inspect ${want} never played`);
};
let started = await inspect("karambit_inspect");
console.log("inspect", JSON.stringify(started));
let t = started.time * 1000;
const at = async (seconds, name) => {
  await advance(seconds * 1000 - t);
  t = seconds * 1000;
  const c = await clip();
  report.shots[name] = { clip: c };
  await shot(name);
};
await at(0.35, "02-inspect-raise");
await at(0.98, "03-inspect-mid-spin");
await at(1.95, "04-inspect-blade");
await at(2.68, "05-inspect-blade-other-side");
await at(3.06, "06-inspect-catch");
await advance(1200);
await shot("07-back-to-idle");
const short = process.env.SHORT === "1";
if (!short) {
  // F again: the other inspect (never the same twice running).
  started = await inspect("karambit_inspect_spin");
  t = started.time * 1000;
  await at(0.8, "08-inspect2-double-spin");
  await at(2.05, "09-inspect2-reverse");
  // An attack cuts it immediately.
  await page.evaluate(() => window.harness.mouse(0, true));
  await advance(STEP);
  await page.evaluate(() => window.harness.mouse(0, false));
  await advance(100);
  await shot("10-slash-cuts-inspect");
  await advance(1200);
  // Heavy stab (right mouse).
  await page.evaluate(() => window.harness.mouse(2, true));
  await advance(STEP);
  await page.evaluate(() => window.harness.mouse(2, false));
  await advance(200);
  await shot("11-stab");
  await advance(1200);
  // Jump: airborne lift, landing.
  await key("Space");
  await advance(250);
  await shot("12-jump");
  await advance(1500);
  // Run forward.
  await page.evaluate(() => window.harness.key("KeyW", true));
  await advance(600);
  await shot("13-run");
  await page.evaluate(() => window.harness.key("KeyW", false));
  await advance(600);
}
const programsAfter = await page.evaluate(() => window.harness.programs());
const added = programsAfter.filter((p) => !programsAtReady.includes(p));
check("no shader compiled after Ready", added.length === 0, added);
check("no page errors", pageErrors.length === 0, pageErrors);
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
await browser.close();
server.close();
