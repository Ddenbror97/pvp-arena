/**
 * node scripts/br/canopy-check/capture.mjs [outDir] ['[[name, {view, deploy, brakeL…}], …]'] —
 * renders the parachute (entry.ts) from the QA angles and in the deploy, steer, dive and landing
 * poses.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? "art/br/build/canopy-check");
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/canopy-check/entry.ts")],
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
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.ready, null, { timeout: 120_000 });
await page.evaluate(() => window.ready);
const cases = JSON.parse(process.argv[3] ?? "null") ?? [
  ["1-rear", { view: "rear" }],
  ["2-side", { view: "side" }],
  ["3-front", { view: "front" }],
  ["4-top", { view: "top" }],
  ["5-low", { view: "low" }],
  ["6-three-quarter", { view: "three-quarter" }],
  ["7-game-camera", { view: "game" }],
  ["8-steer-right", { view: "three-quarter", brakeR: 1 }],
  ["9-dive", { view: "side", dive: 1 }],
  ["10-deploy-0.3s", { view: "rear", deploy: 0.3 }],
  ["11-deploy-0.8s", { view: "rear", deploy: 0.8 }],
  ["12-deploy-1.3s", { view: "rear", deploy: 1.3 }],
  ["13-flare", { view: "side", brakeL: 1, brakeR: 1, flare: 1 }],
  ["14-landed-0.7s", { view: "three-quarter", landed: 0.7 }],
];
for (const [name, o] of cases) {
  await page.evaluate((x) => window.show(x), o);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
}
console.log("wrote", cases.length, "to", outDir);
await browser.close();
server.close();
