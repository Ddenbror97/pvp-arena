/**
 * The Karambit in the battle royale (headless, real client and HUD against the in-page match):
 * jump, land unarmed, the knife in hand (hotbar 3), F inspect, slash and stab against the other
 * player standing an arm's length ahead (the in-page match counts the damage), a backstab, then
 * an AK-47 picked up (1) and back to the knife (3).
 *
 *   node scripts/br/client-sim/knife-capture.mjs [outDir] [--chromium=/path] [--size=1600x900]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/knife-sim",
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
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`, {
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
// Straight onto the ground (the descent is checked by capture.mjs), the other player ahead.
await page.evaluate(() => window.sim.look?.(-0.12));
await wait(600);
await page.evaluate(() => window.sim.knifeSetup?.());
await until((s) => s.predicted.phase === "ground", "on foot", 30000);
await wait(4000);
check("unarmed on landing: the knife is in hand", (await status()).myActive === -1);
await shot("k1-idle");
await page.keyboard.press("KeyF");
await wait(1000);
await shot("k2-inspect");
await wait(1100);
await shot("k3-inspect-late");
await wait(2500);
let hp = (await status()).otherHp;
await click("left");
await wait(350);
await shot("k4-slash");
await wait(1200);
let after = (await status()).otherHp;
check("a slash takes 40", hp - after === 40, { hp, after });
hp = after;
await click("right");
await wait(300);
await shot("k5-stab");
await wait(1500);
after = (await status()).otherHp;
check("a stab takes 65 (or finishes)", hp - after === Math.min(65, hp), { hp, after });
// Backstab: the other player turned away, fresh.
await page.evaluate(() => window.sim.knifeSetup?.(true));
await wait(1500);
await click("left");
await wait(1500);
after = (await status()).otherHp;
check("a slash from behind is a backstab (90)", after === 10, { after });
// A gun picked up: it comes into the hands (1), then 3 brings the knife back.
await page.evaluate(() => window.sim.giveGun?.());
await wait(2500);
check("the AK-47 is drawn", (await status()).myActive === 0);
await shot("k6-gun");
await page.keyboard.press("Digit3");
await wait(400);
await shot("k7-switch-card");
await wait(1500);
check("3 draws the knife", (await status()).myActive === -1);
await shot("k8-knife-again");
check("no page errors", errors.length === 0, errors);
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ shots, checks, errors }, null, 1),
);
console.log("ALLDONE");
await browser.close();
server.close();
