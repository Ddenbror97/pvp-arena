/**
 * Grenades in the real Bomb Defusal client (headless Chromium, SwiftShader), against the in-page
 * room: a Terrorist on site A draws (4) and throws each grenade with real mouse input, an HE
 * overhand at a Police player, a smoke underhand between them, an incendiary with both buttons
 * at their feet. Screenshots along the way, the room's state (damage, the cloud hiding the
 * enemy from the snapshot, the fire burning), draw statistics, and the shader programs before
 * and after (nothing may compile mid-round).
 *
 *   node scripts/fps/bomb-harness/grenades.mjs <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";

const outDir = process.argv[2] ?? "bomb-grenades-out";
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const gpu = process.argv.includes("--gpu");
const useFirefox = process.argv.includes("--firefox");
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
const browser = await (useFirefox ? firefox : chromium).launch({
  ...(exe ? { executablePath: exe } : {}),
  headless: process.argv.includes("--headless") || !gpu,
  args: useFirefox
    ? []
    : [
        ...(gpu
          ? ["--use-angle=d3d11", "--force-high-performance-gpu", "--disable-software-rasterizer"]
          : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
        "--ignore-gpu-blocklist",
        "--no-sandbox",
      ],
});
const page = await browser.newPage({
  viewport: { width: Number(process.env.W ?? 640), height: Number(process.env.H ?? 360) },
});
const pageErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    console.error("console:", m.text().slice(0, 300));
});
page.on("pageerror", (e) => {
  pageErrors.push(e.message);
  console.error("pageerror:", e.message);
});
await page.addInitScript(() => {
  const real = Date.now.bind(Date);
  let held = null;
  Date.now = () => held ?? real();
  window.__clock = { hold: (t) => (held = t), release: () => (held = null), now: () => Date.now() };
});
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.harness === "object");
const report = { steps: [], checks: {} };
const frames = async (n) => {
  const start = await page.evaluate(() => window.harness.diagnostics().renderFrames);
  await page.waitForFunction((s) => window.harness.diagnostics().renderFrames >= s, start + n, {
    timeout: 120_000,
  });
};
const ME = 5;
console.log("starting");
report.load = await page.evaluate((me) => window.harness.start(me), ME);
console.log("loaded", JSON.stringify(report.load));
const layout = fs.readFileSync(path.join(ROOT, "src/lib/fps/sandgate-layout.ts"), "utf8");
const siteText = layout.slice(layout.indexOf("SANDGATE_BOMBSITES"));
const num = (k) => Number(new RegExp(`A:[^}]*?${k}:\\s*(-?[\\d.]+)`, "s").exec(siteText)[1]);
const site = { x0: num("x0"), x1: num("x1"), z0: num("z0"), z1: num("z1") };
const at = { x: (site.x0 + site.x1) / 2, z: (site.z0 + site.z1) / 2 };
await page.evaluate((p) => {
  window.harness.freezeBots(true);
  window.harness.live();
  window.harness.set(5, { x: p.x, z: p.z, y: 0 });
  for (const i of [0, 1, 2, 3, 4, 6, 7, 8, 9]) window.harness.set(i, { x: 0, z: 70, hp: 100 });
}, at);
let clock = await page.evaluate(() => Date.now());
if (!gpu) await page.evaluate((t) => window.__clock.hold(t), clock);
const advance = async (ms) => {
  // Native GPU runs use the real animation and server clocks together. Accelerating only
  // Date.now would make a throw finish on the server before the hand animation can follow.
  if (gpu) {
    await page.waitForTimeout(ms);
    await frames(1);
    return;
  }
  for (let done = 0; done < ms; done += 34) {
    clock += 34;
    await page.evaluate((t) => window.__clock.hold(t), clock);
    await frames(1);
  }
};
await advance(340);
// Face the most open direction (a long clear sight line), then put Police 0 ahead.
const open = await page.evaluate((me) => window.harness.openYaw(me), ME);
const current = await page.evaluate((me) => window.harness.state().players[me].yaw, ME);
await page.evaluate(
  (d) => window.harness.turn(d),
  Math.atan2(Math.sin(open - current), Math.cos(open - current)),
);
await advance(200);
const placeEnemy = async (distance, side = 0) =>
  page.evaluate(
    ([me, d, s]) => {
      const p = window.harness.state().players[me];
      const fx = -Math.sin(p.yaw),
        fz = -Math.cos(p.yaw);
      window.harness.set(0, {
        x: p.x + fx * d + fz * s,
        z: p.z + fz * d - fx * s,
        y: 0,
        hp: 100,
        dead: false,
      });
      return { x: p.x + fx * d, z: p.z + fz * d };
    },
    [ME, distance, side],
  );
const step = async (name, extra = {}) => {
  await frames(1);
  const info = await page.evaluate(
    ([me]) => {
      const s = window.harness.state();
      const v = window.harness.view();
      return {
        d: window.harness.diagnostics(),
        enemyHp: s.players[0].hp,
        meHp: s.players[me].hp,
        weapon: s.players[me].weapon,
        nade: s.players[me].nade ?? null,
        inventory: s.players[me].grenades,
        enemyShown: !!v?.players[0]?.pose,
        world: s.grenades
          ? {
              flying: s.grenades.flying.length,
              smokes: s.grenades.smokes.length,
              fires: s.grenades.fires.length,
            }
          : null,
      };
    },
    [ME],
  );
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 85, type: "jpeg" });
  report.steps.push({ name, ...info, calls: info.d.calls, programs: info.d.programs, ...extra });
  console.log(
    name,
    JSON.stringify({
      ...info,
      d: { calls: info.d.calls, tris: info.d.triangles, programs: info.d.programs },
    }),
  );
  return info;
};
const programsBefore = await page.evaluate(() => window.harness.programs().length);
await placeEnemy(9);
await advance(200);
await step("0-rifle");
// ---------------------------------------------------------------- HE (overhand)
await page.evaluate(() => window.harness.key("Digit4", true));
await page.evaluate(() => window.harness.key("Digit4", false));
await advance(150);
await step("1-he-equip");
await advance(500);
await step("2-he-ready");
await page.evaluate(() => window.harness.mouse(0, true));
await advance(150);
await step("3-he-pin-reach");
await advance(150);
await step("4-he-pin-pull");
await advance(400);
await step("5-he-wound-up");
await page.evaluate(() => window.harness.mouse(0, false));
await advance(68);
await step("6-he-throw");
await advance(136);
await step("7-he-released");
if (gpu)
  await page.waitForFunction(
    () => window.harness.state().grenades?.flying.some((p) => p.type === "he"),
    { timeout: 5000 },
  );
if (!(await page.evaluate(() => window.harness.standNearHeBlast(0))))
  throw Error("HE fixture has no exposed floor near the predicted blast");
await advance(300);
await step("8-he-flight");
for (let i = 0; i < 60; i++) {
  const blasted = await page.evaluate(() =>
    window.harness.state().events.some((e) => e.type === "nade-detonate"),
  );
  if (blasted) break;
  await advance(34);
}
await advance(68);
const he = await step("9-he-blast");
await advance(400);
await step("10-he-after");
report.checks.heDamage = 100 - he.enemyHp;
report.checks.heUsed = he.inventory.he === 0;
// ---------------------------------------------------------------- smoke (underhand)
await placeEnemy(10);
await advance(300);
const clear = await step("11-before-smoke");
report.checks.enemyVisibleBeforeSmoke = clear.enemyShown;
await page.evaluate(() => window.harness.key("Digit4", true));
await page.evaluate(() => window.harness.key("Digit4", false));
await advance(600);
if (gpu)
  await page.waitForFunction(
    () => {
      const p = window.harness.state().players[5];
      return p.nade === "smoke" && Date.now() >= (p.weaponReadyAt ?? 0);
    },
    { timeout: 5000 },
  );
await page.evaluate(() => window.harness.mouse(2, true));
await advance(700);
await page.evaluate(() => window.harness.mouse(2, false));
await advance(2500);
if (gpu)
  await page.waitForFunction(
    () => (window.harness.state().grenades?.smokes.length ?? 0) > 0,
    null,
    { timeout: 6500 },
  );
await step("12-smoke-pop");
await advance(1700);
const smoke = await step("13-smoke-full");
report.checks.enemyHiddenBySmoke = !smoke.enemyShown;
// ---------------------------------------------------------------- incendiary (both buttons)
await advance(400);
// Test burning independently of the earlier cloud, which correctly extinguishes nearby fire.
await page.evaluate(() => window.harness.set(5, { x: 0, y: 0, z: -13, velocityY: 0 }));
await advance(500);
await page.evaluate(() => {
  const h = window.harness;
  const p = h.state().players[5];
  const yaw = h.openYaw(5);
  h.turn(Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw)));
  h.look(0, 225); // Aim toward the clear floor, not a two-second air burst.
});
await advance(300);
await page.evaluate(() => window.harness.key("Digit4", true));
await page.evaluate(() => window.harness.key("Digit4", false));
await advance(600);
if (gpu)
  await page.waitForFunction(
    () => {
      const p = window.harness.state().players[5];
      return p.nade === "fire" && Date.now() >= (p.weaponReadyAt ?? 0);
    },
    { timeout: 5000 },
  );
await page.evaluate(() => {
  window.harness.mouse(0, true);
  window.harness.mouse(2, true);
});
await advance(700);
await page.evaluate(() => {
  window.harness.mouse(0, false);
  window.harness.mouse(2, false);
});
await advance(1600);
if (gpu)
  await page.waitForFunction(() => (window.harness.state().grenades?.fires.length ?? 0) > 0, null, {
    timeout: 5000,
  });
await step("14-fire");
// Stand the enemy in the flames.
const cell = await page.evaluate(() => {
  const f = window.harness.state().grenades?.fires[0];
  return f ? { x: f.cells[0], y: f.cells[1], z: f.cells[2] } : null;
});
report.checks.fireBurning = !!cell;
if (cell) {
  await page.evaluate((c) => window.harness.set(0, { x: c.x, y: c.y, z: c.z, hp: 100 }), cell);
  await advance(1500);
  const burnt = await step("15-fire-burning");
  report.checks.fireDamage = 100 - burnt.enemyHp;
}
await advance(1000);
await step("16-back-to-rifle");
report.checks.programsBefore = programsBefore;
report.checks.programsAfter = await page.evaluate(() => window.harness.programs().length);
report.checks.newPrograms = await page.evaluate(
  (n) => window.harness.programs().slice(n),
  programsBefore,
);
report.errors = [...pageErrors, ...(await page.evaluate(() => window.harness.errors))];
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.checks), "errors", report.errors.length);
await browser.close();
server.close();
if (
  report.errors.length ||
  !(report.checks.heDamage > 0) ||
  !report.checks.heUsed ||
  !report.checks.enemyVisibleBeforeSmoke ||
  !report.checks.enemyHiddenBySmoke ||
  !report.checks.fireBurning ||
  !(report.checks.fireDamage > 0) ||
  report.checks.newPrograms.length
)
  throw Error("Grenade gameplay / render assertions failed; see report.json");
