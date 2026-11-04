/**
 * HUD screenshots (owner's UI spec §F) against the real client and the in-page match, headless:
 * plane, tactical map (with a waypoint), parachute, on foot, inventory (with nearby loot), the
 * gas. The zone runs 4× faster here (?zone=0.25) so the gas arrives within the run.
 *
 *   node scripts/br/client-sim/ui-capture.mjs [outDir] [--chromium=/path] [--size=1600x900]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/ui-sim",
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
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => (errors.push(String(e)), console.log("pageerror", String(e))));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/?loot=1&zone=0.25`, {
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
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 82 });
  shots.push(name);
  console.log(name, JSON.stringify(await hud()));
};
await page.mouse.click(W / 2, H / 2);
await until((s) => s.phase === "plane", "the plane");
await wait(1500);
await shot("ui-1-plane");
// The tactical map: built in slices over a few seconds; a waypoint south-east of the centre.
await page.evaluate(() => window.ui.open("map"));
await wait(9000);
await shot("ui-2-map");
await page.mouse.click(W * 0.56, H * 0.56);
await wait(600);
await shot("ui-2b-map-waypoint");
await page.evaluate(() => window.ui.open(null));
await wait(8000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "freefall", "freefall");
await page.keyboard.down("KeyW");
await until((s) => s.me.phase === "parachute", "the parachute", 60000);
await wait(2500);
await shot("ui-3-parachute");
await until((s) => s.me.phase === "ground" || s.me.phase === "swim", "landing", 150000);
await page.keyboard.up("KeyW");
await wait(2000);
await shot("ui-4-ground");
// Stand on the nearest weapon (in-page match hook), then open the inventory.
await page.evaluate(() => window.sim.toLoot?.());
await wait(2500);
await shot("ui-4b-near-loot");
await page.evaluate(() => window.ui.open("inventory"));
await page.waitForSelector(".br-inventory", { timeout: 10000 }).catch(() => {});
await wait(1200);
await shot("ui-5-inventory");
const take = await page.$(".br-near li button");
if (take) {
  await take.click();
  await wait(2500);
  await shot("ui-5b-inventory-taken");
}
await page.evaluate(() => window.ui.open(null));
// The gas: wait (zone ×4) until the circle passes over the player.
const t0 = Date.now();
while (Date.now() - t0 < 420000) {
  const h = await hud();
  if (h?.zone?.outside) break;
  await wait(1000);
}
await wait(1500);
await shot("ui-6-gas");
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ shots, errors }, null, 1));
console.log("errors:", errors);
await browser.close();
server.close();
