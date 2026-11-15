/**
 * Tree LOD walk (headless Chromium, SwiftShader, the real island renderer): the camera moves
 * through a forest in equal steps and every frame is saved. A tree that changes how it is drawn
 * between two steps (model to impostor, one LOD to the next) changes far more pixels than the
 * step itself does: tree-walk-diff.py reports those jumps (owner, 2026-11-15: trees "shift/
 * change style/design while walking/driving").
 *
 *   node scripts/br/explorer/tree-walk.mjs <outDir> [--from=x,z] [--heading=deg] [--step=1]
 *     [--steps=48] [--look=deg off the heading] [--up=1.7] [--size=640x360]
 *   python3 scripts/br/explorer/tree-walk-diff.py <outDir>
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? "art/br/build/tree-walk");
const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const [x0, z0] = arg("from", "-1600,-3100").split(",").map(Number);
const heading = (Number(arg("heading", "90")) * Math.PI) / 180;
const look = heading + (Number(arg("look", "25")) * Math.PI) / 180;
const step = Number(arg("step", "1")),
  steps = Number(arg("steps", "48")),
  up = Number(arg("up", "1.7"));
const [W, H] = arg("size", "640x360").split("x").map(Number);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/explorer/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='explorer.js'></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/explorer.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
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
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.explorer, null, { timeout: 60000 });
await page.evaluate(() => window.explorer.ready);
const rows = [];
let warmed = false;
for (let i = 0; i <= steps; i++) {
  const x = x0 + Math.sin(heading) * step * i,
    z = z0 - Math.cos(heading) * step * i;
  const stats = await page.evaluate(
    async ([x, z, up, look]) => {
      const y = window.explorer.groundAt(x, z) + up;
      return window.explorer.view(
        [x, y, z],
        [x + Math.sin(look) * 100, y, z - Math.cos(look) * 100],
      );
    },
    [x, z, up, look],
  );
  // The first view also loads what it needs: draw it again once that has arrived.
  if (i === 0 && !warmed) {
    warmed = true;
    await new Promise((r) => setTimeout(r, 4000));
    i--;
    continue;
  }
  await page.screenshot({ path: path.join(outDir, `${String(i).padStart(3, "0")}.png`) });
  rows.push({
    i,
    x: +x.toFixed(1),
    z: +z.toFixed(1),
    triangles: stats.triangles,
    calls: stats.calls,
    trees: stats.trees,
  });
}
fs.writeFileSync(path.join(outDir, "walk.json"), JSON.stringify(rows));
console.log(`${rows.length} frames in ${outDir}`);
await browser.close();
server.close();
