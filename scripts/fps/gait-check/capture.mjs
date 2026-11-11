/**
 * node scripts/fps/gait-check/capture.mjs [outDir] — both characters in every gait (entry.ts),
 * a strip of moments through the cycle per gait, from the side.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? "art/br/build/gait-check");
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/fps/gait-check/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}</style><script type=module src=/e.js></script>";
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
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.ready, null, { timeout: 120_000 });
await page.evaluate(() => window.ready);
if (process.env.SLIDE) {
  for (const seat of ["A", "B"])
    for (const [name, speed, x, z] of [
      ["walk", 1.4, 0, -1],
      ["walk-shift", 2.25, 0, -1],
      ["run5", 5, 0, -1],
      ["sprint7.5", 7.5, 0, -1],
      ["strafe5", 5, 1, 0],
      ["back5", 5, 0, 1],
    ]) {
      const [med, max, n] = await page.evaluate((o) => window.slide(o), {
        seat,
        speed,
        x,
        z,
        t: 4,
      });
      console.log(
        seat,
        name,
        `body ${speed} m/s: planted ankle median ${med.toFixed(2)} max ${max.toFixed(2)} m/s (${n} frames)`,
      );
    }
  await browser.close();
  server.close();
  process.exit(0);
}
if (process.env.REACH) {
  for (const seat of ["A", "B"])
    for (const [name, speed, x, z] of [
      ["stand", 0, 0, -1],
      ["walk", 1.4, 0, -1],
      ["run5", 5, 0, -1],
      ["sprint", 7.5, 0, -1],
      ["strafe5", 5, 1, 0],
      ["strafe7.5", 7.5, 1, 0],
      ["back5", 5, 0, 1],
    ])
      console.log(
        seat,
        name,
        (await page.evaluate((o) => window.reach(o), { seat, speed, x, z, t: 2 })).toFixed(4),
      );
  await browser.close();
  server.close();
  process.exit(0);
}
if (process.env.DEATH) {
  for (const seat of ["A", "B"])
    for (const view of ["side", "front"])
      for (const t of [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.5, 3.5]) {
        await page.evaluate((x) => window.show(x), { seat, gait: "death", t, view });
        await page.screenshot({
          path: path.join(outDir, `death-${seat}-${view}-${t.toFixed(1)}.png`),
        });
      }
  await browser.close();
  server.close();
  process.exit(0);
}
if (process.env.SWIM) {
  for (const seat of ["A", "B"])
    for (const view of ["side", "front"])
      for (const t of [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]) {
        await page.evaluate((x) => window.show(x), { seat, gait: "swim", t, view });
        await page.screenshot({
          path: path.join(outDir, `swim-${seat}-${view}-${t.toFixed(1)}.png`),
        });
      }
  await browser.close();
  server.close();
  process.exit(0);
}
const gaits = (process.env.GAITS ?? "idle,walk,jog,run,back,left,right,crouch").split(",");
const moments = [1.0, 1.15, 1.3, 1.45, 1.6, 1.75];
let n = 0;
for (const seat of ["A", "B"])
  for (const gait of gaits) {
    for (const [k, t] of moments.entries()) {
      await page.evaluate((x) => window.show(x), {
        seat,
        gait,
        t,
        view: gait === "left" || gait === "right" ? "front" : "side",
      });
      await page.screenshot({ path: path.join(outDir, `${seat}-${gait}-${k}.png`) });
      n++;
    }
  }
const cases = { length: n };
console.log("wrote", cases.length, "to", outDir);
await browser.close();
server.close();
