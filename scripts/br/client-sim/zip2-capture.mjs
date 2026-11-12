/**
 * The second zip-line, broadcast tower → Iron Peaks watchtower (headless, real client and HUD
 * against the in-page match): on the tower's platform the [E] prompt, E takes hold, the
 * third-person ride (default view, then orbited to the side, the front, overhead and low
 * behind), the landing by the watchtower and first person again, the first line's prompt on the
 * watchtower's deck; then the other player riding in, watched from beside the landing.
 *
 *   node scripts/br/client-sim/zip2-capture.mjs [outDir] [--chromium=/path] [--size=1280x720]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/zip2-sim",
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
await page.goto(`http://127.0.0.1:${server.address().port}/?immortal=1`, {
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
const LONG = 900000;
await until((s) => s.phase === "plane", "the plane");
await wait(11000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "freefall" || s.me.phase === "parachute", "the jump", 60000);
const heading = await page.evaluate(() => window.sim.toZip2());
await until((s) => s.predicted.phase === "ground", "on the tower's platform", 60000);
await page.evaluate((h) => window.sim.arena.look(h, -0.1), heading);
await wait(5000);
const text = await page.evaluate(() => document.body.innerText);
check("the [E] Use Zip-Line prompt on the platform", /Use Zip-Line/.test(text));
check("it names the way to the watchtower", /To the Iron Peaks watchtower/.test(text));
await shot("y1-prompt");
await page.keyboard.press("KeyE");
const ms = (v) => (s) => (s.zip ?? -1) >= v || (s.zip === null && s.me.phase === "ground");
let s = await until((x) => x.me.phase === "zip", "taking hold", 60000);
await until(ms(500), "the reach", LONG);
await shot("y2-attach");
// Held mid-line (cruising) while the camera's views are taken (see sim.holdZip).
await until(ms(5200), "cruising", LONG);
await page.evaluate(() => window.sim.holdZip(6000));
s = await until((x) => x.ndc?.blend > 0.95, "the follow view", LONG);
await page.evaluate((h) => window.sim.arena.look(h, -0.1), heading);
await wait(5000);
await shot("y3-angle-a-rear");
s = await status();
console.log("framing", JSON.stringify({ ndc: s.ndc, cam: s.cam, d: s.camDist }));
check(
  "third person behind and above the rider",
  s.camDist > 3 && s.camDist < 7.5 && s.cam[1] > s.shown[1] + 1.5,
  { d: s.camDist, cam: s.cam, shown: s.shown },
);
for (const [name, dy, p] of [
  ["y4-angle-b-side", Math.PI / 2, -0.05],
  ["y5-angle-c-front", Math.PI, 0.05],
  ["y6-angle-d-overhead", 0, -0.85],
  ["y7-angle-e-low-rear", 0, 0.5],
]) {
  await page.evaluate(([h, pp]) => window.sim.arena.look(h, pp), [heading + dy, p]);
  await wait(6000);
  await shot(name);
  s = await status();
  check(`${name}: camera on the rider`, s.camDist > 1.5 && s.camDist < 7.5, s.camDist);
}
await page.evaluate(() => window.sim.holdZip(null));
await page.evaluate((h) => window.sim.arena.look(h, -0.1), heading);
await until(ms(19500), "braking", LONG);
await shot("y8-braking");
const landed = await until((x) => x.me.phase === "ground", "the landing", LONG);
check("on the landing platform", Math.abs(landed.me.y - landed.ground) < 0.05, landed.me);
// (The view's blend back runs on frame time: slow under software rendering.)
s = await until((x) => (x.ndc?.blend ?? 0) < 0.02, "first person", LONG);
await shot("y9-first-person");
check("first person again (camera at the eye)", s.camDist > 1.2 && s.camDist < 1.8, s.camDist);
// The first line from the watchtower's deck.
const h0 = await page.evaluate(() => window.sim.toZip());
await until((x) => x.predicted.phase === "ground", "on the deck", 60000);
await page.evaluate((h) => window.sim.arena.look(h, -0.05), h0);
await wait(4000);
check(
  "the first line's prompt on the deck",
  /To Pine Ridge/.test(await page.evaluate(() => document.body.innerText)),
);
await shot("y10-first-line-prompt");
// Another player on the second line, from beside the landing.
await page.evaluate(() => window.sim.zip2Other());
await until((x) => x.otherPhase === "zip", "the other rider", 60000);
await page.evaluate((h) => window.sim.arena.look(h + Math.PI - 0.5, 0.12), heading);
const zipOf = () => page.evaluate(() => window.sim.otherZip?.() ?? -1);
const seen = [];
for (const [at, name] of [
  [16500, "y11-remote-incoming"],
  [19700, "y12-remote-landing"],
]) {
  const t = Date.now();
  while ((await zipOf()) < at && Date.now() - t < LONG) await wait(400);
  await shot(name);
  s = await status();
  console.log(name, JSON.stringify({ ms: await zipOf(), seen: s.otherSeen, server: s.otherPos }));
  seen.push(s.otherSeen);
}
// Riding in (phase 6) on the second line's cable, then on the landing (riding or just off it,
// phase 4).
check(
  "the other rider is seen riding in, then at the landing",
  Array.isArray(seen[0]) &&
    seen[0][4] === 6 &&
    Array.isArray(seen[1]) &&
    (seen[1][4] === 6 || seen[1][4] === 4) &&
    Math.hypot(seen[1][1] - -577.2, seen[1][3] - -4091.4) < 6,
  seen,
);
check("no page errors", errors.length === 0, errors);
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ shots, checks, errors }, null, 1),
);
console.log("ALLDONE");
await browser.close();
server.close();
