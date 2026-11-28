/**
 * Hit effects and incoming-damage feedback: pictures and measurements (owner, 2026-11-27:
 * "visual comparisons, performance measurements"). Headless Chromium with SwiftShader, the
 * game's own modules (entry.ts) and its real character.
 *
 *   node scripts/fps/hit-feedback/capture.mjs <outDir> [--before=<git ref>]
 *
 * Writes, in <outDir>: shots/<name>.png (the stage: the blood effect as it was at <git ref>,
 * default origin/main, and as it is now, from several places and at several moments after the
 * hit), overlay/<name>.png (the damage overlay's states) and report.json (the measurements).
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? "hit-feedback-out");
const ref = process.argv.find((a) => a.startsWith("--before="))?.slice(9) ?? "origin/main";
fs.mkdirSync(path.join(outDir, "shots"), { recursive: true });
fs.mkdirSync(path.join(outDir, "overlay"), { recursive: true });
// The blood effect as it was: that revision's module, its imports pointed at this tree.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hit-feedback-"));
const beforeFile = path.join(tmp, "blood-effects.before.ts");
fs.writeFileSync(
  beforeFile,
  execFileSync("git", ["show", `${ref}:src/lib/fps/blood-effects.ts`], { cwd: ROOT })
    .toString()
    .replaceAll('from "./', 'from "@/lib/fps/'),
);
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/fps/hit-feedback/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src"), "hit-feedback-before": beforeFile },
    nodePaths: [path.join(ROOT, "node_modules")],
    logLevel: "error",
  })
).outputFiles[0].text;
// The overlay's styles: the game's own (duel.css `.fps-dmg*`).
const css = fs
  .readFileSync(path.join(ROOT, "src/components/fps/duel.css"), "utf8")
  .split("\n.duel-capture-hint {")[0]
  .split("/* ---- incoming damage")[1];
if (!css) throw new Error("duel.css: the .fps-dmg block was not found");
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000;position:relative}canvas{display:block}
/* ---- incoming damage${css}</style><script type=module src='entry.js'></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/entry.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
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
    "--enable-precise-memory-info",
    "--js-flags=--expose-gc",
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.fx, null, { timeout: 120000 });
await page.evaluate(() => window.fx.ready);

const CHEST = [0, 1.22, 0.12],
  HEAD = [0.02, 1.63, 0.1];
// Where it is seen from: the shooter (straight on), a bystander to the side, from behind the
// target, from a floor above; and the shooter at four ranges.
const VIEWS = {
  shooter: { eye: [0.4, 1.6, 6], at: [0, 1.25, 0] },
  side: { eye: [6, 1.6, 0.6], at: [0, 1.25, 0] },
  behind: { eye: [-1.2, 1.7, -3.4], at: [0, 1.25, 0] },
  above: { eye: [3.2, 5.2, 4.4], at: [0, 1.1, 0] },
  "range-2m": { eye: [0.2, 1.6, 2], at: [0, 1.3, 0] },
  "range-12m": { eye: [0.6, 1.6, 12], at: [0, 1.25, 0] },
  "range-40m": { eye: [1.5, 1.6, 40], at: [0, 1.25, 0] },
  "range-90m-scoped": { eye: [3, 1.6, 90], at: [0, 1.25, 0], fov: 18 },
};
const SHOOTER = [0.4, 1.6, 6];
const report = { ref, shots: {}, errors };
async function shot(name, view, which, point, zone, ms) {
  const v = VIEWS[view];
  const info = await page.evaluate(
    ([v, which, point, from, zone, ms]) => {
      window.fx.view(v.eye, v.at, v.fov ?? 74);
      return window.fx.shot(which, { point, from, zone }, ms);
    },
    [v, which, point, SHOOTER, zone, ms],
  );
  await page.screenshot({ path: path.join(outDir, "shots", `${name}.png`) });
  report.shots[name] = info;
}
for (const which of ["before", "after"]) {
  for (const ms of [50, 130, 260, 420])
    await shot(
      `time-${String(ms).padStart(3, "0")}-${which}`,
      "shooter",
      which,
      CHEST,
      "chest",
      ms,
    );
  for (const view of Object.keys(VIEWS))
    await shot(`view-${view}-${which}`, view, which, CHEST, "chest", 130);
  await shot(`head-${which}`, "shooter", which, HEAD, "head", 130);
}
await shot("clean", "shooter", "none", CHEST, "chest", 0);
report.effect = await page.evaluate(
  ([point, from]) => {
    window.fx.view([0.2, 1.6, 2], [0, 1.3, 0]);
    return window.fx.measure({ point, from, zone: "chest" });
  },
  [CHEST, SHOOTER],
);

// The overlay, over the stage as a stand-in for the game's picture.
await page.setViewportSize({ width: 1280, height: 720 });
await page.evaluate(() => {
  window.fx.view([0.4, 1.6, 6], [0, 1.25, 0]);
  window.fx.shot("none", { point: [0, 1, 0], from: [0, 1, 5], zone: "chest" }, 0);
});
const STATES = {
  "healthy-no-hit": { health: 1 },
  "hit-front-left": {
    health: 0.8,
    hits: [{ key: 1, x: -6, z: -8, damage: 30, armoured: false, ago: 30 }],
  },
  "hit-armoured-right": {
    health: 1,
    hits: [{ key: 2, x: 9, z: -2, damage: 12, armoured: true, ago: 30 }],
  },
  "hits-three-directions": {
    health: 0.62,
    hits: [
      { key: 1, x: -6, z: -8, damage: 30, armoured: false, ago: 200 },
      { key: 2, x: 9, z: 1, damage: 12, armoured: true, ago: 500 },
      { key: 3, x: 1, z: 10, damage: 40, armoured: false, ago: 30 },
    ],
  },
  "turned-90-left": {
    health: 0.62,
    yaw: Math.PI / 2,
    hits: [
      { key: 1, x: -6, z: -8, damage: 30, armoured: false, ago: 200 },
      { key: 2, x: 9, z: 1, damage: 12, armoured: true, ago: 500 },
      { key: 3, x: 1, z: 10, damage: 40, armoured: false, ago: 300 },
    ],
  },
  "health-49": { health: 0.49 },
  "health-35": { health: 0.35 },
  "health-20": { health: 0.2 },
  "health-08": { health: 0.08 },
  "health-08-under-fire": {
    health: 0.08,
    hits: [{ key: 1, x: 4, z: -9, damage: 30, armoured: false, ago: 30 }],
  },
  eliminated: { health: null },
};
report.overlay = {};
for (const [name, state] of Object.entries(STATES)) {
  report.overlay[name] = await page.evaluate((s) => window.fx.overlay(s), state);
  await page.screenshot({ path: path.join(outDir, "overlay", `${name}.png`) });
}
report.centre = await page.evaluate(() => {
  window.fx.overlay({ health: 0.08 });
  return window.fx.centreAlpha();
});
report.overlayCost = await page.evaluate(() => window.fx.measureOverlay());
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log(
  JSON.stringify(
    { effect: report.effect, overlayCost: report.overlayCost, centre: report.centre, errors },
    null,
    1,
  ),
);
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });
