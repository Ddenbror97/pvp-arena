/**
 * First-person C4 defuse in the real Bomb Defusal client (headless Chromium, SwiftShader): a
 * Police player kneels at a bomb planted on site A and holds the use key through a full 10 s
 * defuse, then a second defuse is interrupted by releasing the key. Screenshots along the way, the
 * room's bomb state at each and draw statistics.
 *
 *   node scripts/fps/bomb-harness/defuse.mjs <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "bomb-defuse-out";
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
          me: window.harness.state().players[0],
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
  const t = info.bomb.defuseStartedAt ? (now - info.bomb.defuseStartedAt) / 1000 : null;
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
// Slot 0 is Police in the first half. Plant the bomb on A, then put slot 0 beside it facing it.
report.load = await page.evaluate(() => window.harness.start(0));
let clock = await page.evaluate(() => Date.now());
await page.evaluate((t) => window.__clock.hold(t), clock);
const advance = async (ms) => {
  for (let done = 0; done < ms; done += 34) {
    clock += 34;
    await page.evaluate((t) => window.__clock.hold(t), clock);
    await frames(1);
  }
};
await page.evaluate(() => {
  window.harness.freezeBots(true);
  window.harness.live();
  for (const i of [5, 6, 7, 8, 9]) window.harness.set(i, { x: 0, z: 60, hp: 100 });
});
await advance(340);
const yaw = await page.evaluate(() => window.harness.diagnostics().camera[3]);
await page.evaluate((yaw) => {
  window.harness.plant("A");
  const s = window.harness.state();
  const b = s.bomb;
  // Stand 0.55 m short of the bomb, facing it (the camera looks along -z rotated by yaw).
  window.harness.set(0, { x: b.x + Math.sin(yaw) * 0.55, z: b.z + Math.cos(yaw) * 0.55, y: 0 });
}, yaw);
await advance(340);
await page.evaluate(() => window.harness.look(0, 520));
await advance(170);
await step("0-rifle-at-bomb");
await page.evaluate(() => window.harness.key("KeyE", true));
for (
  let i = 0;
  i < 40 && !(await page.evaluate(() => window.harness.state().bomb.defuser === 0));
  i++
)
  await advance(34);
const startedAt = await page.evaluate(() => window.harness.state().bomb.defuseStartedAt);
for (const t of [0.3, 0.9, 1.35, 2.0, 5.2, 8.62, 9.75]) {
  await advance(startedAt + t * 1000 - clock);
  await step(`1-defuse-${t.toFixed(2)}`);
}
await advance(startedAt + 10_200 - clock);
await waitBomb("defused", 5_000);
await step("2-defused");
await advance(300);
await step("3-after");
report.errors = await page.evaluate(() => window.harness.errors);
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log("errors", report.errors.length);
await browser.close();
server.close();
