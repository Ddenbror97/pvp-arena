/**
 * Vehicle client check (headless Chromium): a remote driver, then each of the four vehicles
 * entered, driven, turned and slid. Screenshots in outDir.
 *
 *   node scripts/br/drive-sim/capture.mjs [outDir] [--only=sedan,bike]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? "art/br/build/drive-sim");
const W = 960,
  H = 540;
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/drive-sim/entry.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    alias: { "@": path.join(ROOT, "src") },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000;font-family:system-ui}#game{position:absolute;inset:0}#hud{position:absolute;inset:0;pointer-events:none}${css}</style><div id=game></div><div id=hud></div><script type=module src=/sim.js></script>`;
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
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--enable-precise-memory-info",
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => (errors.push(String(e)), console.log("pageerror", String(e))));
page.on(
  "console",
  (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()),
);
await page.goto(
  `http://127.0.0.1:${server.address().port}/${process.argv.includes("--lobby") ? "?lobby" : ""}`,
  {
    waitUntil: "domcontentloaded",
  },
);
await page.waitForFunction(() => window.sim?.ready, null, { timeout: 60000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 82 });
  console.log(name);
};
await wait(5000);
console.log("spawned", JSON.stringify(await page.evaluate(() => window.sim.spawned.length)));
if (process.argv.includes("--lobby")) {
  await page.evaluate(() => window.sim.look(window.sim.yaw, 0.05));
  await wait(3000);
  await shot("0-lobby");
  await wait(8000);
  await shot("0-lobby-later");
  process.exit(0);
}
for (const kind of ["sedan", "suv", "pickup", "bike"]) {
  await page.evaluate((k) => window.sim.seatOther(k), kind);
  await wait(3500);
  await shot(`1-seated-${kind}`);
}
if (process.argv.includes("--seats")) process.exit(0);
const only = process.argv.find((x) => x.startsWith("--only="))?.slice(7);
for (const kind of only ? only.split(",") : ["sedan", "suv", "pickup", "bike"]) {
  await page.evaluate((k) => window.sim.toVehicle(k), kind);
  await wait(1500);
  await shot(`2-${kind}-prompt`);
  await page.keyboard.press("KeyE");
  await wait(4000);
  await shot(`3-${kind}-seated`);
  await page.keyboard.down("KeyW");
  await wait(9000);
  await shot(`4-${kind}-straight`);
  await page.keyboard.down("KeyA");
  await wait(1200);
  await shot(`5-${kind}-turn`);
  if (kind !== "bike") {
    await page.keyboard.down("Space");
    await wait(900);
    await shot(`6-${kind}-handbrake`);
    await page.keyboard.up("Space");
  }
  await page.keyboard.up("KeyA");
  await page.keyboard.up("KeyW");
  console.log(kind, JSON.stringify(await page.evaluate((k) => window.sim.vehicle(k), kind)));
  await page.keyboard.down("KeyS");
  await wait(6000);
  await page.keyboard.up("KeyS");
  await page.keyboard.press("KeyE");
  await wait(4000);
}
console.log("errors", JSON.stringify(errors.slice(0, 10)));
await browser.close();
server.close();
