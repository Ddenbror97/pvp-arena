/**
 * The MP5 and Desert Eagle in the battle royale (headless, real client and HUD against the
 * in-page match): land, an MP5 with a red dot and silencer (1) and a Deagle with a red dot (3);
 * idle, aim, a burst, an empty reload for each; the knife on 4. Screenshots and checks.
 *
 *   node scripts/br/client-sim/gun-capture.mjs [outDir] [--chromium=/path] [--size=1600x900]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/gun-sim",
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
  if (r.status() === 404 && !r.url().endsWith("/favicon.ico")) errors.push(`404 ${r.url()}`);
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
await page.evaluate(() => window.sim.giveGun?.("mp5", "sight-red", "silencer"));
await page.evaluate(() => window.sim.giveGun?.("deagle", "sight-red", null));
await wait(3000);
check("the MP5 is drawn (slot 1)", (await status()).myActive === 0);
await shot("g1-mp5-idle");
await page.mouse.down({ button: "right" });
await wait(1500);
await shot("g2-mp5-aim");
await page.mouse.down({ button: "left" });
await wait(500);
await shot("g3-mp5-burst");
await page.mouse.up({ button: "left" });
await page.mouse.up({ button: "right" });
await wait(800);
// Empty the magazine, then the empty reload (R).
await page.mouse.down({ button: "left" });
await wait(3500);
await page.mouse.up({ button: "left" });
await page.keyboard.press("KeyR");
for (const [t, n] of [
  [350, "g4-mp5-reload-a"],
  [650, "g5-mp5-reload-b"],
  [600, "g6-mp5-reload-c"],
]) {
  await wait(t);
  await shot(n);
}
await wait(2500);
await page.keyboard.press("Digit3");
await wait(2000);
check("3 draws the Deagle", (await status()).myActive === 2);
await shot("g7-deagle-idle");

await page.mouse.down({ button: "left" });
await wait(150);
await shot("g8-deagle-shot");
await wait(1500);
await page.mouse.up({ button: "left" });
await page.mouse.down({ button: "right" });
await wait(1500);
await shot("g9-deagle-aim");
await page.mouse.up({ button: "right" });
for (let i = 0; i < 8; i++) {
  await click("left");
  await wait(450);
}
await page.keyboard.press("KeyR");
for (const [t, n] of [
  [250, "g10-deagle-reload-a"],
  [600, "g11-deagle-reload-b"],
  [450, "g12-deagle-reload-c"],
]) {
  await wait(t);
  await shot(n);
}
await wait(2000);
await page.keyboard.press("Digit4");
await wait(1500);
check("4 draws the knife", (await status()).myActive === -1);
await shot("g13-knife");
check("no page errors", errors.length === 0, errors);
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ shots, checks, errors }, null, 1),
);
console.log("ALLDONE");
await browser.close();
server.close();
