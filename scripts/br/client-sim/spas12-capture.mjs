/**
 * The SPAS-12 in the battle royale (headless, real client and HUD against the in-page match):
 * land, a SPAS-12 with a red dot and the Silencer; the equip, idle, the inspection (F), aim, a
 * burst, the tube shot empty and the reload that follows by itself (shell by shell, counted on
 * the server), and a reload broken off by a shot. Screenshots and checks.
 *
 *   node scripts/br/client-sim/spas12-capture.mjs [outDir] [--chromium=/path] [--size=1600x900]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : "art/br/build/spas12-sim",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const [W, H] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1600x900")
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
  (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text()),
);
// Missing files are listed by URL (favicon.ico is the page's own, not the client's).
page.on("response", (r) => {
  // (The map's worker is a source file the harness's bundle does not serve; the client falls
  // back to drawing the map on the main thread.)
  if (r.status() === 404 && !/\/(favicon\.ico|tactical-map\.worker\.ts)$/.test(r.url()))
    errors.push(`404 ${r.url()}`);
});
await page.goto(`http://127.0.0.1:${server.address().port}/`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page
  .waitForFunction(() => window.sim, null, { timeout: 180000 })
  .catch((e) => {
    console.log("errors so far", errors);
    throw e;
  });
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
const click = async (button) => {
  await page.mouse.down({ button });
  await wait(80);
  await page.mouse.up({ button });
};
await page.mouse.click(W / 2, H / 2);
await until((s) => s.phase === "plane", "the plane");
await wait(11000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "parachute", "the parachute", 60000);
await page.evaluate(() => window.sim.look?.(-0.05));
await wait(600);
await page.evaluate(() => window.sim.knifeSetup?.());
await until((s) => s.predicted.phase === "ground", "on foot", 30000);
await wait(3000);
await page.evaluate(() => window.sim.giveGun?.("spas12", "sight-red", "silencer"));
const gun = () => page.evaluate(() => window.sim.gun());
// Software WebGL draws about a frame a second and the in-page match steps once a frame, so
// the match runs in slow motion: every step below waits for the server's state, not the clock.
const untilGun = async (pred, label, ms = 600000) => {
  const t = Date.now();
  for (;;) {
    const g = await gun();
    if (g && pred(g)) return g;
    if (Date.now() - t > ms)
      throw new Error(`timed out waiting for ${label}: ${JSON.stringify(g)}`);
    await wait(120);
  }
};
await untilGun((g) => g.item === "spas12", "the SPAS-12 in hand");
await shot("s1-equip");
await wait(6000);
check("the SPAS-12 is drawn (slot 1)", (await status()).myActive === 0);
check("eight shells in the tube", (await gun())?.mag === 8, await gun());
await shot("s2-idle");
await page.keyboard.press("KeyF");
await wait(2500);
await shot("s3-inspect");
await wait(8000);
await page.mouse.down({ button: "right" });
await wait(6000);
await shot("s5-aim");
// The server's count and stage, recorded in the page from here on (a screenshot takes longer
// than a whole reload, so the script itself would miss most of it).
await page.evaluate(() => {
  window.__seen = [];
  let last = "";
  setInterval(() => {
    const g = window.sim.gun();
    const key = g ? `${g.stage}:${g.mag}` : "";
    if (g && key !== last) window.__seen.push([g.stage, g.mag]);
    last = key;
  }, 15);
});
const seenSoFar = () => page.evaluate(() => window.__seen.splice(0));
await page.mouse.down({ button: "left" });
await untilGun((g) => g.mag <= 7, "the first shot");
await shot("s6-shot");
await page.mouse.up({ button: "right" });
// The rest of the tube on the held trigger; the reload then starts by itself.
await untilGun((g) => g.mag === 0 || g.reloading, "the empty tube");
await page.mouse.up({ button: "left" });
await untilGun((g) => g.stage === 1, "a shell going in");
await shot("s7-reload");
await untilGun((g) => g.mag === 8 && !g.reloading, "the full tube");
const seen = await seenSoFar();
const fromEmpty = seen.slice(seen.findIndex((s) => s[0] === 0));
check(
  "the trigger held empties the tube, a shell at a time",
  seen
    .filter((s) => s[0] === null)
    .map((s) => s[1])
    .join() === "8,7,6,5,4,3,2,1,0,8",
  seen,
);
check(
  "the reload: the start, eight shells one at a time, the end",
  fromEmpty.map((s) => `${s[0]}:${s[1]}`).join(" ") ===
    "0:0 1:0 1:1 1:2 1:3 1:4 1:5 1:6 1:7 2:8 null:8",
  fromEmpty,
);
await wait(3000);
await shot("s8-reloaded");
// Most of the tube shot off, R, and the trigger pulled again during the reload: it stops
// there, without its end stage, and the shells loaded so far stay in the gun.
await page.mouse.down({ button: "left" });
await untilGun((g) => g.mag <= 2, "six shots");
await page.mouse.up({ button: "left" });
await untilGun((g) => !g.reloading && g.mag >= 1 && g.mag <= 2, "the trigger let go");
await wait(1500);
await seenSoFar();
await page.keyboard.press("KeyR");
await untilGun((g) => g.reloading, "the reload under way");
await page.mouse.down({ button: "left" });
await untilGun((g) => !g.reloading, "the reload broken off");
await page.mouse.up({ button: "left" });
await shot("s9-broken-off");
const cut = await seenSoFar();
check(
  "a shot asked for breaks the reload off, the shells loaded stay",
  cut.some(
    (s, i) =>
      (s[0] === 0 || s[0] === 1) && cut[i + 1]?.[0] === null && cut[i + 1][1] === s[1] && s[1] < 8,
  ),
  cut,
);
await wait(4000);
await shot("s10-ready-again");
check("no page errors", errors.length === 0, errors);
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ shots, checks, errors, seen }, null, 1),
);
console.log("ALLDONE");
await browser.close();
server.close();
