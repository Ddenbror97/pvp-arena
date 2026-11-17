/**
 * Guns worn on the back (headless, real client against the in-page match): the other player an
 * arm's length ahead with an AWP and a SPAS-12, holding the AWP, then the Karambit (both on the
 * back), then the SPAS-12 (the AWP on the back); each seen from his front, right, back and left.
 * The worn guns reach the client through the server's own rows (match.ts carriedRow).
 *
 *   node scripts/br/client-sim/back-guns-capture.mjs [outDir] [--chromium=/path] [--size=1280x720]
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
    : "art/br/build/back-guns-sim",
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
page.on("crash", () => console.log("page crashed; last console:", errors.slice(-5).join(" | ")));
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
// Straight onto the ground (no flight: the descent is checked by capture.mjs), the other player
// an arm's length ahead, facing you.
await wait(3000);
await page.evaluate(() => window.sim.knifeSetup?.());
await until((s) => s.predicted.phase === "ground", "on foot", 30000);
await wait(4000);
const loadouts = [
  ["awp", ["awp", "spas12"], 0],
  ["knife", ["awp", "spas12"], -1],
  ["spas12", ["awp", "spas12"], 1],
];
for (const [name, guns, active] of loadouts) {
  await page.evaluate(([g, a]) => window.sim.otherLoadout?.(g, a), [guns, active]);
  await wait(5000);
  await page.evaluate(() => window.sim.look?.(-0.12));
  await wait(1200);
  await shot(`${name}-front`);
  for (const view of ["right", "back", "left"]) {
    await page.evaluate(() => window.sim.otherTurn?.(Math.PI / 2));
    await wait(2500);
    await shot(`${name}-${view}`);
  }
  await page.evaluate(() => window.sim.otherTurn?.(Math.PI / 2));
}
const s = await status();
console.log("other", JSON.stringify(s.otherSeen), "me", JSON.stringify(s.me));
console.log(errors.slice(0, 5).join("\n"));
await browser.close();
server.close();
