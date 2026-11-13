/**
 * First-person C4 plant in the real Bomb Defusal client (headless Chromium, SwiftShader): a
 * Terrorist carrier on site A holds the use key through a full plant, then a second plant is
 * interrupted by releasing the key. Screenshots along the way, the room's bomb state at each,
 * draw statistics with the rifle and with the C4 up, and GPU resources before and after.
 *
 *   node scripts/fps/bomb-harness/plant.mjs <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "bomb-plant-out";
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
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("pageerror", (e) => console.error("pageerror:", e.message));
// A controllable wall clock (the room and the renderer both read Date.now): software rendering
// is far slower than real time, so each screenshot is taken with the clock held at its moment.
await page.addInitScript(() => {
  const real = Date.now.bind(Date);
  let held = null;
  Date.now = () => held ?? real();
  window.__clock = {
    hold: (t) => (held = t),
    release: () => (held = null),
    now: () => Date.now(),
  };
});
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.harness === "object");
const report = { steps: [] };
/** Wait for the room's bomb state; on timeout print what the room has. */
const waitBomb = async (state, timeout = 60_000) => {
  try {
    await page.waitForFunction((s) => window.harness.state().bomb.state === s, state, { timeout });
  } catch (error) {
    console.log(
      await page.evaluate(() =>
        JSON.stringify({
          bomb: window.harness.state().bomb,
          phase: window.harness.state().phase,
          events: window.harness.state().events.slice(-4),
          sent: window.harness.sent(),
          me: window.harness.state().players[5],
        }),
      ),
    );
    throw error;
  }
};
const frames = async (n) => {
  const start = await page.evaluate(() => window.harness.diagnostics().renderFrames);
  await page.waitForFunction((s) => window.harness.diagnostics().renderFrames >= s, start + n, {
    timeout: 120_000,
  });
};
const step = async (name) => {
  await frames(1);
  const info = await page.evaluate(() => ({
    bomb: window.harness.state().bomb,
    d: window.harness.diagnostics(),
  }));
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 85, type: "jpeg" });
  const now = await page.evaluate(() => window.__clock.now());
  const t = info.bomb.startedAt ? (now - info.bomb.startedAt) / 1000 : null;
  report.steps.push({
    name,
    state: info.bomb.state,
    plantSeconds: t,
    calls: info.d.calls,
    triangles: info.d.triangles,
    programs: info.d.programs,
    geometries: info.d.geometries,
    textures: info.d.textures,
  });
  console.log(
    name,
    info.bomb.state,
    t?.toFixed(2) ?? "",
    "calls",
    info.d.calls,
    "tris",
    info.d.triangles,
  );
};
// Slot 5 is a Terrorist in the first half; give it the bomb on site A and look at the floor ahead.
report.load = await page.evaluate(() => window.harness.start(5));
// Site A's rectangle, read from the generated layout (sandgate-layout.ts SANDGATE_BOMBSITES).
const layout = fs.readFileSync(path.join(ROOT, "src/lib/fps/sandgate-layout.ts"), "utf8");
const siteText = layout.slice(layout.indexOf("SANDGATE_BOMBSITES"));
const num = (k) => Number(new RegExp(`A:[^}]*?${k}:\\s*(-?[\\d.]+)`, "s").exec(siteText)[1]);
const site = { x0: num("x0"), x1: num("x1"), z0: num("z0"), z1: num("z1") };
const at = { x: (site.x0 + site.x1) / 2, z: (site.z0 + site.z1) / 2 };
await page.evaluate((p) => {
  window.harness.freezeBots(true);
  window.harness.live();
  window.harness.set(5, { x: p.x, z: p.z, y: 0 });
  for (const i of [0, 1, 2, 3, 4]) window.harness.set(i, { x: 0, z: 60, hp: 100 });
}, at);
// From here the room runs on a held clock advanced in 34 ms ticks (one rendered frame each), so
// slow software rendering cannot run the round out.
let clock = await page.evaluate(() => Date.now());
await page.evaluate((t) => window.__clock.hold(t), clock);
const advance = async (ms) => {
  for (let done = 0; done < ms; done += 34) {
    clock += 34;
    await page.evaluate((t) => window.__clock.hold(t), clock);
    await frames(1);
  }
};
await advance(340);
await page.evaluate(() => {
  const s = window.harness.state();
  s.bomb = { state: "carried", carrier: 5 };
});
await advance(170);
await step("0-rifle");
const baseline = report.steps[0];
// Full plant: hold E until the room reports planted; screenshots at moments of the clip.
await page.evaluate(() => window.harness.key("KeyE", true));
for (
  let i = 0;
  i < 40 && (await page.evaluate(() => window.harness.state().bomb.state)) !== "planting";
  i++
)
  await advance(34);
await waitBomb("planting", 5_000);
const plantStart = await page.evaluate(() => window.harness.state().bomb.startedAt);
for (const t of [0.15, 0.3, 0.8, 1.25, 1.7, 2.14, 2.52, 2.85, 3.1]) {
  await advance(plantStart + t * 1000 - clock);
  await step(`1-plant-${t.toFixed(2)}`);
}
await advance(plantStart + 3400 - clock);
await waitBomb("planted", 5_000);
await step("2-planted");
await page.evaluate(() => window.harness.key("KeyE", false));
await advance(200);
await step("3-complete-0.2s");
await advance(600);
await step("4-rifle-back");
await page.evaluate(() => window.harness.look(0, 400));
await advance(102);
await step("5-planted-bomb-on-floor");
await page.evaluate(() => window.harness.look(0, -400));
// Interrupted plant: carried again, hold E for 1.3 s, release.
await page.evaluate(() => {
  const s = window.harness.state();
  s.bomb = { state: "carried", carrier: 5 };
});
await advance(136);
await page.evaluate(() => window.harness.key("KeyE", true));
for (
  let i = 0;
  i < 40 && (await page.evaluate(() => window.harness.state().bomb.state)) !== "planting";
  i++
)
  await advance(34);
const second = await page.evaluate(() => window.harness.state().bomb.startedAt);
await advance(second + 1300 - clock);
await step("6-second-plant-1.3s");
await page.evaluate(() => window.harness.key("KeyE", false));
for (
  let i = 0;
  i < 40 && (await page.evaluate(() => window.harness.state().bomb.state)) !== "carried";
  i++
)
  await advance(34);
await advance(102);
await step("7-cancelling-0.1s");
await advance(800);
await step("8-rifle-after-cancel");
report.errors = await page.evaluate(() => window.harness.errors);
report.baseline = baseline;
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log("errors", report.errors.length);
await browser.close();
server.close();
