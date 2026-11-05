/**
 * Battle royale client check (headless): the real client against the in-page match, driven by
 * keys through countdown, plane, jump, freefall and parachute; screenshots and prediction error.
 *
 *   node scripts/br/client-sim/capture.mjs [outDir] [--chromium=/path]
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
    : "art/br/build/client-sim",
);
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
  "<!doctype html><meta charset=utf-8><title>Project Island client check</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='sim.js'></script>";
// Static copy for real-GPU checks.
const site = path.join(outDir, "site");
fs.mkdirSync(path.join(site, "fps/br"), { recursive: true });
fs.writeFileSync(path.join(site, "index.html"), html);
fs.writeFileSync(path.join(site, "sim.js"), js);
fs.cpSync(path.join(ROOT, "public/fps/br"), path.join(site, "fps/br"), { recursive: true });

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
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => (errors.push(String(e)), console.log("pageerror", String(e))));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  if (process.env.VERBOSE) console.log("console", m.type(), m.text());
});
await page.goto(`http://127.0.0.1:${server.address().port}/`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 180000 });
await page.evaluate(() => window.sim.ready);
const status = () => page.evaluate(() => window.sim.status());
const until = async (pred, label, ms = 120000) => {
  const t = Date.now();
  for (;;) {
    const s = await status();
    if (pred(s)) return s;
    if (Date.now() - t > ms)
      throw new Error(`timed out waiting for ${label}: ${JSON.stringify(s)}`);
    await new Promise((r) => setTimeout(r, 250));
  }
};
const report = { errors, steps: [] };
const shot = async (name) => {
  const s = await status();
  report.steps.push({ name, ...s });
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 80 });
  console.log(name, JSON.stringify(s));
};
await page.mouse.click(W / 2, H / 2); // pointer lock attempt (headless may refuse; keys still work)
await until((s) => s.phase === "plane", "the plane");
await shot("1-plane");
await new Promise((r) => setTimeout(r, 11000)); // jump window opens at 10 s
await page.keyboard.press("Space");
// The canopy opens on leaving the plane (owner, 2026-11-05).
await until((s) => s.me.phase === "parachute", "the parachute", 60000);
await page.keyboard.down("KeyW");
await new Promise((r) => setTimeout(r, 2500));
await shot("2-parachute-open");
// A burst of frames under the canopy (flicker check: FRAMES=n).
for (let i = 0; i < Number(process.env.FRAMES ?? 0); i++) {
  await page.screenshot({ path: path.join(outDir, `burst-${String(i).padStart(2, "0")}.png`) });
  await new Promise((r) => setTimeout(r, 120));
}
// Diving (Ctrl) for a few seconds.
await page.keyboard.down("ControlLeft");
await new Promise((r) => setTimeout(r, 3000));
await shot("2b-parachute-dive");
await page.keyboard.up("ControlLeft");
await new Promise((r) => setTimeout(r, 1500));
await shot("3-parachute");
// Turning right (D) with the hands pulling, then a look up at the canopy.
await page.keyboard.down("KeyD");
await new Promise((r) => setTimeout(r, 1200));
await shot("3b-parachute-turn");
await page.keyboard.up("KeyD");
await page.evaluate(() => window.sim.look?.(0.9));
await new Promise((r) => setTimeout(r, 400));
await shot("3c-parachute-look-up");
await page.evaluate(() => window.sim.look?.(-0.35));
await until((s) => s.me.phase === "ground" || s.me.phase === "swim", "landing", 90000);
await page.keyboard.up("KeyW");
await new Promise((r) => setTimeout(r, 1500));
await shot("4-landed");
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log(
  "max prediction error (m):",
  Math.max(...report.steps.map((s) => s.error)).toFixed(2),
  "errors:",
  errors,
);
await browser.close();
server.close();
