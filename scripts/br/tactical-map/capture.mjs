/**
 * Render the tactical map and the minimap picture headless, for review.
 *
 *   node scripts/br/tactical-map/capture.mjs [outDir] [--chromium=/path]
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
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
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
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.out, null, { timeout: 60000 });
const out = await page.evaluate(() => window.out);
for (const k of ["map", "mini"])
  fs.writeFileSync(path.join(outDir, `${k}.jpg`), Buffer.from(out[k].split(",")[1], "base64"));
console.log(`built in ${Math.round(out.ms)} ms → ${outDir}`);
await browser.close();
server.close();
