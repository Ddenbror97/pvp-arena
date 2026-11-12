/**
 * node scripts/fps/rope-check/capture.mjs [outDir] [--seats=A,B] [--views=side,rear,orbit,front]
 *   [--angle=62] [--speed=2] [--phases=0,0.25,0.5,0.75] [--cell=300x460]
 *
 * The rope climb (entry.ts): a strip of eight moments through one cycle per character and view,
 * the same held still, and the measurements (hands on the rope, feet on the rock, stretch).
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
    : "art/br/build/rope-check",
);
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const seats = arg("seats", "A,B").split(",");
const views = arg("views", "side,rear,orbit,front").split(",");
const angle = Number(arg("angle", "62"));
const speed = Number(arg("speed", "2"));
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/fps/rope-check/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}canvas{display:block}</style><script type=module src=/e.js></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/e.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const phases = arg("phases", "0,0.125,0.25,0.375,0.5,0.625,0.75,0.875").split(",").map(Number);
const cell = arg("cell", "300x460").split("x").map(Number);
const page = await browser.newPage({
  viewport: { width: cell[0] * phases.length, height: cell[1] },
});
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on(
  "console",
  (m) => (m.type() === "error" || m.text().startsWith("trace")) && console.log("console", m.text()),
);
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.ready, null, { timeout: 120_000 });
await page.evaluate(() => window.ready);
if (process.env.TRACE) await page.evaluate(() => (window.TRACE = true));
const report = {};
for (const seat of seats) {
  const rig = await page.evaluate((s) => window.rig(s), seat);
  const m = await page.evaluate((o) => window.measure(o), { seat, speed, angle });
  report[seat] = { rig, measure: m };
  console.log(seat, "rig", JSON.stringify(rig));
  console.log(
    seat,
    Object.entries(m)
      .map(([k, v]) => `${k} ${v.toFixed(2)}`)
      .join(", "),
  );
  if (process.env.MEASURE) continue;
  for (const view of views)
    for (const still of [false, true]) {
      if (still && view !== "side" && view !== "orbit") continue;
      await page.evaluate((o) => window.sheet(o), {
        seat,
        view,
        phases,
        angle,
        speed,
        still,
        cell,
      });
      const name = `${seat}-${view}${still ? "-still" : ""}.png`;
      await page.screenshot({ path: path.join(outDir, name) });
      console.log("wrote", name);
    }
}
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
await browser.close();
server.close();
