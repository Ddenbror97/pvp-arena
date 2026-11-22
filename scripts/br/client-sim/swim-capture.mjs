/**
 * Swimming, in first person and seen by others (headless, real client against the in-page
 * match): you in the sea doing the crawl, looking ahead, down and to the sides, treading water,
 * walking in from the shallows and back out; the other player swimming past, toward and away
 * from you (ACTORS=B: the terrorist); then eliminated, through the swimmer's eyes.
 *
 *   [ACTORS=B] node scripts/br/client-sim/swim-capture.mjs [outDir] [--chromium=/path] [--size=1280x720]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/swim-sim",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const [W, H] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1280x720")
  .split("x")
  .map(Number);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/client-sim/ui.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@": path.join(ROOT, "src") },
    // (Component stylesheets are inlined into the page below, not bundled.)
    loader: { ".css": "empty" },
    logLevel: "error",
  })
).outputFiles[0].text;
const css = [
  "src/components/fps/duel.css",
  "src/components/fps/br.css",
  "src/components/fps/spectator.css",
]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const html = `<!doctype html><meta charset=utf-8><title>Project Island HUD check</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}${css}</style><div class="duel-game br-game"><div class="duel-render-host" id="arena"></div><div id="hud"></div></div><script type=module src='ui.js'></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/ui.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
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
// Reduced motion: software WebGL renders ~1 frame/s, so CSS fades would be caught mid-way.
const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
// Headless Chromium cannot take the pointer: the client's own flag for these checks.
await page.addInitScript(() => (globalThis.__brAssumeLock = true));
const errors = [];
page.on("pageerror", (e) => (errors.push(String(e)), console.log("pageerror", String(e))));
page.on(
  "console",
  (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text()),
);
// Missing files are listed by URL (favicon.ico is the page's own, not the client's).
page.on("response", (r) => {
  if (r.status() === 404 && !r.url().endsWith("/favicon.ico")) errors.push(`404 ${r.url()}`);
});
// (immortal: the check outlasts the first zone, far from this lake.)
await page.goto(`http://127.0.0.1:${server.address().port}/?immortal=1`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 60000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => page.evaluate(() => window.sim.status());
const hud = () =>
  page.evaluate(() => {
    const h = window.ui.hud();
    return h && { phase: h.phase, my: h.myPhase, zone: h.zone, nearby: h.nearby?.length ?? 0 };
  });
const until = async (pred, label, ms = 120000) => {
  const t = Date.now();
  for (;;) {
    const s = await status();
    if (pred(s)) return s;
    if (Date.now() - t > ms)
      throw new Error(`timed out waiting for ${label}: ${JSON.stringify(s)}`);
    await wait(250);
  }
};
const shots = [];
const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", name, detail === undefined ? "" : JSON.stringify(detail));
};
const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 84 });
  shots.push(name);
  console.log("shot", name);
};
if (process.env.ACTORS === "B") await page.evaluate(() => (globalThis.__brActorsFrom = "B"));
await page.mouse.click(W / 2, H / 2);
await wait(3000);
const key = async (k, down) => (down ? page.keyboard.down(k) : page.keyboard.up(k));
// (After take-off: the warm-up's end puts everyone aboard the plane.)
await until((s) => s.phase !== "waiting", "the countdown", 60000);
await page.evaluate(() => window.sim.takeOff?.());
await until((s) => s.phase === "plane" || s.phase === "active", "take-off", 180000);
await wait(1000);
// (The middle of the lake: open water all round.)
const yaw0 = await page.evaluate(() => window.sim.toWater?.(99));
await until((s) => s.predicted.phase === "swim", "swimming", 30000);
console.log("at", JSON.stringify((await status()).me), "heading", yaw0);
const level = (await status()).me.y;
const only = process.env.ONLY;
if (only !== "enter") {
  await wait(2500);
  // Treading water: both hands sculling in front, the gun put away.
  await shot("pov-tread");
  await page.evaluate((y) => window.sim.face?.(y, -0.45), yaw0);
  await wait(1200);
  await shot("pov-tread-down");
  await page.evaluate((y) => window.sim.face?.(y, -0.8), yaw0);
  await wait(1500);
  await shot("pov-tread-ripples");
  await page.evaluate((y) => window.sim.face?.(y, 0), yaw0);
  // The crawl: a run of frames through the stroke.
  await key("KeyW", true);
  await wait(2500);
  for (let i = 0; i < 6; i++) {
    await shot(`pov-crawl-${i}`);
    await wait(350);
  }
  await page.evaluate((y) => window.sim.face?.(y, -0.3), yaw0);
  await wait(900);
  await shot("pov-crawl-down-0");
  await wait(500);
  await shot("pov-crawl-down-1");
  await page.evaluate((y) => window.sim.face?.(y, 0.35), yaw0);
  await wait(900);
  await shot("pov-crawl-up");
  // Turning while swimming: the view sweeps left, then right.
  for (const [name, by] of [
    ["left", 0.5],
    ["right", -0.5],
  ]) {
    for (let i = 1; i <= 4; i++) {
      await page.evaluate(([y, b, k]) => window.sim.face?.(y + (b * k) / 4, 0), [yaw0, by, i]);
      await wait(250);
    }
    await shot(`pov-turn-${name}`);
    await page.evaluate((y) => window.sim.face?.(y, 0), yaw0);
    await wait(700);
  }
  // Weapon keys do not bring a gun back into the stroke.
  await page.keyboard.press("Digit1");
  await wait(700);
  await shot("pov-crawl-after-weapon-key");
  await key("KeyW", false);
  await wait(2500);
  await shot("pov-stopped");
  // Others, seen from the water: swimming a circle 5 m ahead, so the stroke comes past from the
  // front, both sides, the rear and the diagonals; then treading water, close.
  await page.evaluate(() => window.sim.otherSwim?.(5, 2.2, 0, false, 2.2));
  await wait(2500);
  for (let i = 0; i < 10; i++) {
    await shot(`other-circle-${i}`);
    await wait(620);
  }
  await page.evaluate(() => window.sim.otherSwim?.(2.6, 0.3, 2.6, true));
  await wait(3000);
  await shot("other-tread-0");
  await wait(500);
  await shot("other-tread-1");
  await page.evaluate((y) => window.sim.face?.(y, -0.25), yaw0);
  await page.evaluate(() => window.sim.otherSwim?.(1.5, 1.2, 0, false));
  await wait(1800);
  await shot("other-rear-close");
  await page.evaluate((y) => window.sim.face?.(y, 0), yaw0);
  // The same swimmer from above the water line (how a player on the shore sees them): standing on
  // the bottom in the shallows nearby is checked below; here only the waterline is read off.
  const s0 = await status();
  check("you are swimming", s0.me.phase === "swim", s0.me);
  check(
    "the eyes are just above the water, not a standing height over it",
    s0.cam[1] - level > 0.15 && s0.cam[1] - level < 0.5,
    s0.cam,
  );
}
// Walking in from the shallows (the water at the chest), into the crawl; then back out.
// (Software WebGL sends a couple of inputs a second: the few metres either way take a while.)
const yaw1 = await page.evaluate(() => window.sim.toWater?.(1.3));
await until((s) => s.predicted.phase === "ground", "standing in the shallows", 30000);
await wait(1500);
await shot("enter-0-wading");
await key("KeyW", true);
const cams = [];
const track = setInterval(async () => {
  const s = await status().catch(() => null);
  if (s) cams.push([s.predicted.phase, s.camY, s.me.x, s.me.z]);
}, 60);
await until((s) => s.predicted.phase === "swim", "walking into a swim", 180000);
await shot("enter-1-afloat");
await wait(700);
await shot("enter-2");
await wait(1500);
await shot("enter-3-crawl");
await page.evaluate((y) => window.sim.face?.(y + Math.PI, 0), yaw1);
await wait(1200);
await shot("exit-0-turned");
await until((s) => s.predicted.phase === "ground", "swimming back to the shallows", 240000);
await shot("exit-1-feet-down");
await wait(900);
await shot("exit-2-wading-out");
await key("KeyW", false);
clearInterval(track);
// The eyes across both flips: the body moves 1.2-1.4 m between the bottom and the surface in
// one step; the view stays where it was, just over the water (not a standing height above it
// going in, not under it coming out).
const flips = [];
for (let i = 1; i < cams.length; i++)
  if (cams[i][0] !== cams[i - 1][0]) flips.push([cams[i][0], +(cams[i][1] - level).toFixed(2)]);
check(
  "the view stays just over the water entering and leaving it",
  flips.length === 2 && flips.every(([, h]) => h > 0.05 && h < 1),
  flips,
);
// Eliminated: through the other swimmer's eyes (their arms, their stroke).
await page.evaluate(() => window.sim.toWater?.(99));
await until((s) => s.predicted.phase === "swim", "swimming again", 30000);
await page.evaluate(() => window.sim.otherSwim?.(6, 0, 0, false));
await page.evaluate(() => window.sim.die?.());
await wait(3500);
await shot("spectate-crawl-0");
await wait(450);
await shot("spectate-crawl-1");
console.log(errors.slice(0, 8).join("\n"));
// (The tactical map's worker is not served by this page: the map is not part of this check.)
const real = errors.filter((e) => !/tactical-map\.worker/.test(e));
check("no page errors", real.length === 0, real.slice(0, 3));
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ checks, shots }, null, 1));
await browser.close();
server.close();
process.exit(checks.every((c) => c.ok) ? 0 : 1);
