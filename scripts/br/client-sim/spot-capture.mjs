/**
 * Spot check (headless, the real client against the in-page match): the local player stood at
 * each listed place, looking where asked, one screenshot each. For building and prop reviews:
 * what the player sees there in first person, with the game's own streaming, LODs and lighting.
 *
 *   node scripts/br/client-sim/spot-capture.mjs <outDir> <spots.json> [--chromium=/path]
 *     [--size=1280x720]
 *
 * spots.json: [{ "name": "depot-1", "x": 2288, "z": -1564, "y"?: 19.3, "above"?: 30,
 *   "yaw": 0.0, "pitch": -0.1, "wait"?: 6000 }, …] in world metres; yaw 0 looks toward −Z,
 *   π/2 toward −X. Without `y` the player stands on whatever is under (x, z) below `above`
 *   (default: the terrain + 50 m, i.e. the highest floor or roof there).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const [outArg, spotsArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!spotsArg) {
  console.error("usage: spot-capture.mjs <outDir> <spots.json>");
  process.exit(2);
}
const outDir = path.resolve(outArg);
const spots = JSON.parse(fs.readFileSync(spotsArg, "utf8"));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const [W, H] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1280x720")
  .split("x")
  .map(Number);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/client-sim/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='sim.js'></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/sim.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
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
const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
await page.addInitScript(() => (globalThis.__brAssumeLock = true));
page.on("pageerror", (e) => console.log("pageerror", String(e)));
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
    if (Date.now() - t > ms) throw new Error(`timed out waiting for ${label}`);
    await wait(250);
  }
};
await page.mouse.click(W / 2, H / 2);
await until((s) => s.phase === "plane", "the plane");
await wait(11000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "freefall" || s.me.phase === "parachute", "the jump", 60000);
let last = null;
for (const s of spots) {
  const at = await page.evaluate(
    ([x, z, y, above]) => window.sim.place(x, z, y ?? undefined, above ?? undefined),
    [s.x, s.z, s.y ?? null, s.above ?? null],
  );
  await until((x) => x.predicted.phase === "ground", "on the ground", 60000).catch(() => {});
  await page.evaluate(([yaw, pitch]) => window.sim.arena.look(yaw, pitch), [s.yaw, s.pitch ?? 0]);
  // Far moves stream new cells and models in: wait longer for the first look at a place.
  const far = !last || Math.hypot(last.x - s.x, last.z - s.z) > 80;
  await wait(s.wait ?? (far ? 12000 : 3500));
  await page.evaluate(([yaw, pitch]) => window.sim.arena.look(yaw, pitch), [s.yaw, s.pitch ?? 0]);
  await wait(800);
  await page.screenshot({ path: path.join(outDir, `${s.name}.jpg`), quality: 85 });
  const st = await status();
  console.log(s.name, JSON.stringify({ at, me: st.me, cam: st.cam }));
  last = s;
}
await browser.close();
server.close();
