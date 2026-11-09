/**
 * Ground-loot review screenshots (guns and ammo boxes as players see them on the ground).
 *
 *   node scripts/br/loot-review/capture.mjs [outDir] [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const args = process.argv.slice(2);
const outDir = path.resolve(
  args[0] && !args[0].startsWith("--") ? args.shift() : "art/br/build/loot-review",
);
const exe = args.find((a) => a.startsWith("--chromium="))?.slice(11);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/loot-review/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>body{margin:0}</style><script type=module src='r.js'></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/r.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.review, null, { timeout: 120000 });
await page.evaluate(() => window.review.ready);
for (const v of ["top", "player", "low"]) {
  await page.evaluate((n) => window.review.view(n), v);
  await page.screenshot({ path: path.join(outDir, `${v}.png`) });
}
console.log("errors", errors.length ? errors : "none");
await browser.close();
server.close();
