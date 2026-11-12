/**
 * Render the tactical map and the minimap picture headless, for review.
 *
 *   node scripts/br/tactical-map/capture.mjs [outDir] [--chromium=/path] [--main] [--size=4096]
 *
 * The terrain is drawn by the worker, as in the game (--main: on the page's thread); the
 * report says which, how long it took, and the longest the page's thread was held.
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
    : "art/br/build/tactical-map",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/tactical-map/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    logLevel: "error",
  })
).outputFiles[0].text;
// The worker, where `new URL("./tactical-map.worker.ts", import.meta.url)` points from e.js.
const workerJs = (
  await build({
    entryPoints: [path.join(ROOT, "src/lib/fps/br/tactical-map.worker.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    logLevel: "error",
  })
).outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/tactical-map.worker.ts")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(workerJs);
  if (url === "/") return res.end("<!doctype html><script type=module src=/e.js></script>");
  if (url === "/e.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror", String(e)));
const query = [
  process.argv.includes("--main") ? "main=1" : "",
  process.argv.find((a) => a.startsWith("--size="))?.slice(2) ?? "",
]
  .filter(Boolean)
  .join("&");
await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`);
await page.waitForFunction(() => window.out, null, { timeout: 120000 });
const out = await page.evaluate(() => window.out);
for (const k of ["map", "mini"])
  fs.writeFileSync(path.join(outDir, `${k}.jpg`), Buffer.from(out[k].split(",")[1], "base64"));
console.log(
  `built in ${Math.round(out.ms)} ms (${out.worker ? "worker" : "page thread"}; longest hold of the page thread ${out.longestMs.toFixed(1)} ms) → ${outDir}`,
);
await browser.close();
server.close();
