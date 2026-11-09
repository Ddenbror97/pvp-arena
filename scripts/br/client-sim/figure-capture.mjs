/**
 * The inventory's operator (B) as equipped, against the real client and the in-page match:
 * land, open the inventory unarmed (the Karambit in hand, nothing worn), then wear level 1, 2 and
 * 3 helmet, vest and backpack, then take an AK-47; a screenshot and the figure image each time.
 *
 *   node scripts/br/client-sim/figure-capture.mjs [outDir] [--chromium=/path] [--size=1600x900]
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
    : "art/br/build/figure-sim",
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
const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 84 });
  // The figure itself, as the page shows it.
  const src = await page.evaluate(() => document.querySelector(".br-inv-figure img")?.src ?? "");
  if (src.startsWith("data:image/png"))
    fs.writeFileSync(
      path.join(outDir, `${name}-figure.png`),
      Buffer.from(src.split(",")[1], "base64"),
    );
  shots.push({ name, live: src.startsWith("data:") });
  console.log("shot", name, src.startsWith("data:") ? "live figure" : src);
};
await page.mouse.click(W / 2, H / 2);
await until((s) => s.phase === "plane", "the plane");
await wait(11000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "parachute", "the parachute", 60000);
await page.evaluate(() => window.sim.knifeSetup?.());
await until((s) => s.predicted.phase === "ground", "on foot", 30000);
await wait(2500);
await page.evaluate(() => window.ui.open("inventory"));
await page.waitForSelector(".br-inventory", { timeout: 10000 }).catch(() => {});
await wait(6000);
await shot("f0-unarmed");
for (const level of [1, 2, 3]) {
  await page.evaluate((l) => window.sim.giveGear?.(l), level);
  await wait(4000);
  await shot(`f${level}-gear-${level}`);
}
await page.evaluate(() => window.sim.giveGun?.());
await wait(4000);
await shot("f4-ak47");
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ shots, errors }, null, 1));
console.log("errors:", errors);
console.log("ALLDONE");
await browser.close();
server.close();
