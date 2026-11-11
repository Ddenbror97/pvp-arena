/**
 * The Iron Peaks → Pine Ridge zip-line (headless, real client and HUD against the in-page match):
 * on the watchtower deck the [E] prompt, E takes hold, the third-person ride (camera distance,
 * orbit with the mouse), the landing and first person again; then the other player riding in,
 * watched from the Pine Ridge landing (the remote actor's pose).
 *
 *   node scripts/br/client-sim/zip-capture.mjs [outDir] [--chromium=/path] [--size=1280x720]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/zip-sim",
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
    logLevel: "error",
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
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
  (m) => (
    process.env.ZIP_DEBUG && console.log("console", m.type(), m.text()),
    m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text())
  ),
);
// Missing files are listed by URL (favicon.ico is the page's own, not the client's).
page.on("response", (r) => {
  if (r.status() === 404 && !r.url().endsWith("/favicon.ico")) errors.push(`404 ${r.url()}`);
});
await page.goto(`http://127.0.0.1:${server.address().port}/`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 240000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => page.evaluate(() => window.sim.status());
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
const click = async (button) => {
  await page.mouse.down({ button });
  await wait(80);
  await page.mouse.up({ button });
};
await page.mouse.click(W / 2, H / 2);
// Software WebGL starves the in-page server's timer (≈ 1 frame/s), so every step below waits on
// the match's own clock (heights, the ride's ms), never on wall time.
const LONG = 900000;
await until((s) => s.phase === "plane", "the plane");
await wait(11000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "freefall" || s.me.phase === "parachute", "the jump", 60000);
// The watchtower's ladder: E at its foot, W up, over the rail onto the deck.
const ladderYaw = await page.evaluate(() => window.sim.toLadder?.());
await until((s) => s.predicted.phase === "ground", "at the ladder's foot", 60000);
await page.evaluate((h) => window.sim.arena.look(h, 0.15), ladderYaw);
await wait(4000);
check(
  "the [E] Climb Ladder prompt at its foot",
  /Climb Ladder/.test(await page.evaluate(() => document.body.innerText)),
);
await shot("l1-ladder-prompt");
await page.keyboard.press("KeyE");
await until((s) => s.me.phase === "ladder", "on the ladder", 60000);
await page.keyboard.down("KeyW");
await until((s) => s.me.y > 452, "half way up", LONG);
await shot("l2-climbing");
const top = await until((s) => s.me.phase === "ground", "off at the top", LONG);
await page.keyboard.up("KeyW");
check("climbed onto the deck", top.me.y > 455.9 && Math.abs(top.me.y - top.ground) < 0.05, top.me);
check("prediction on the server's climb", top.error < 0.1, top.error);
await wait(3000);
await shot("l3-on-deck");
// The zip-line from the deck.
const heading = await page.evaluate(() => window.sim.toZip?.());
await until((s) => s.predicted.phase === "ground", "on the deck", 60000);
await page.evaluate((h) => window.sim.arena.look(h, -0.05), heading);
await wait(4000);
check(
  "the [E] Use Zip-Line prompt on the deck",
  /Use Zip-Line/.test(await page.evaluate(() => document.body.innerText)),
);
await shot("z1-prompt");
await page.keyboard.press("KeyE");
// At a given ride time, or past it (the ride may end between two polls).
const ms = (v) => (s) => (s.zip ?? -1) >= v || (s.zip === null && s.me.phase === "ground");
let s = await until((x) => x.me.phase === "zip", "taking hold", 60000);
check("the server took the act (riding)", s.me.phase === "zip", s.me);
await until(ms(500), "the reach", LONG);
await shot("z2-attach");
await until(ms(2500), "the pull-away", LONG);
await shot("z3-pull-away");
s = await until(ms(7000), "cruising", LONG);
await shot("z4-ride");
check("third person, 4–7.5 m from the rider's feet", s.camDist > 4 && s.camDist < 7.5, s.camDist);
check("camera above the rider", s.cam[1] > s.shown[1] + 1.5, { cam: s.cam, y: s.shown[1] });
// Orbit: the mouse turns the camera around the rider; the ride is unchanged.
await page.evaluate((h) => window.sim.arena.look(h + 1.4, -0.25), heading);
s = await until(ms(11000), "the orbit", LONG);
await wait(2500);
await shot("z5-orbit");
s = await status();
check("orbit keeps the camera on the rider", s.camDist > 3 && s.camDist < 7, s.camDist);
await page.evaluate((h) => window.sim.arena.look(h, -0.1), heading);
await until(ms(18000), "mid-ride", LONG);
await shot("z6-mid");
await until(ms(27000), "braking", LONG);
await shot("z7-braking");
await until(ms(29100), "the drop", LONG);
await shot("z8-landing");
const landed = await until((x) => x.me.phase === "ground", "the landing", LONG);
check("on the platform or ground", Math.abs(landed.me.y - landed.ground) < 0.05, landed.me);
await wait(6000);
s = await status();
await shot("z9-first-person");
check("first person again (camera at the eye)", s.camDist > 1.2 && s.camDist < 1.8, s.camDist);
// Another player climbing (the clip from their height), seen from beside the ladder.
const yawL = await page.evaluate(() => window.sim.ladderOther?.());
await until((x) => x.otherPhase === "ladder", "the other climbing", 60000);
// Facing the ladder from where the local player stands (4.5 m east, 1.2 m south of its foot).
await page.evaluate((h) => window.sim.arena.look(h - 0.26, 0.28), yawL);
await until((x) => x.otherPos[1] > 450.4, "the other a metre up", LONG);
await page.evaluate(() => window.sim.otherClimb?.(0));
await wait(5000);
await shot("l4-remote-climb-low");
await page.evaluate(() => window.sim.otherClimb?.(1));
await until((x) => x.otherPos[1] > 452.4, "the other higher", LONG);
await page.evaluate(() => window.sim.otherClimb?.(0));
await page.evaluate((h) => window.sim.arena.look(h - 0.26, 0.55), yawL);
await wait(5000);
await shot("l5-remote-climb-high");
s = await status();
await page.evaluate(() => window.sim.otherClimb?.(1));
check(
  "the other climber is seen on the ladder",
  Array.isArray(s.otherSeen) && s.otherSeen[4] === 7,
  s.otherSeen,
);
// Others on the zip-line: the other player rides in, watched from beside the landing.
await page.evaluate(() => window.sim.zipOther?.());
await until((x) => x.otherPhase === "zip", "the other rider", 60000);
await wait(3000);
await page.evaluate((h) => window.sim.arena.look(h + Math.PI, 0.12), heading);
const zipOf = () => page.evaluate(() => window.sim.otherZip?.() ?? -1);
for (const [at, name] of [
  [24500, "z10-remote-incoming"],
  [28200, "z11-remote-near"],
]) {
  const t = Date.now();
  while ((await zipOf()) < at && Date.now() - t < LONG) await wait(400);
  await shot(name);
}
s = await status();
check("the other rider is seen", Array.isArray(s.otherSeen) && s.otherSeen[4] === 6, s.otherSeen);
check("no page errors", errors.length === 0, errors);
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ shots, checks, errors }, null, 1),
);
console.log("ALLDONE");
await browser.close();
server.close();
