/**
 * Project Island stress scene run (headless Chromium, SwiftShader): builds scripts/br/stress,
 * runs the fixed camera path and writes outDir/report.json and a screenshot.
 *
 *   node scripts/br/stress/capture.mjs [outDir] [--chromium=/path] [--frames=600]
 *
 * Also writes outDir/site/ for the real-GPU run: serve it and open index.html?run=1.
 * (SwiftShader renders on the CPU: its frame times say nothing about a GPU; draws, triangles
 * and the CPU update time do.)
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/stress",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const [W, H] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1280x720")
  .split("x")
  .map(Number);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/stress/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><title>Project Island stress</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='stress.js'></script>";
// Static copy for real-GPU checks.
const site = path.join(outDir, "site");
fs.mkdirSync(path.join(site, "fps/br"), { recursive: true });
fs.writeFileSync(path.join(site, "index.html"), html);
fs.writeFileSync(path.join(site, "stress.js"), js);
fs.cpSync(path.join(ROOT, "public/fps/br"), path.join(site, "fps/br"), { recursive: true });

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/stress.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
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
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const frames = Number(process.argv.find((a) => a.startsWith("--frames="))?.slice(9) ?? 600);
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.stress, null, { timeout: 60000 });
await page.evaluate(() => window.stress.ready);
const result = await page.evaluate((n) => window.stress.run(n), frames);
await page.screenshot({ path: path.join(outDir, "stress.jpg"), quality: 80 });
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ ...result, errors }, null, 1));
console.log(JSON.stringify(result, null, 1));
if (errors.length) console.log("errors", errors);
await browser.close();
server.close();
