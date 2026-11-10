/**
 * Facade atlas bake: renders the near model of every flat mid-distance LOD from five sides into
 * the shared atlas (see art/blender/br/build_facades.mjs, which writes the layout and the LOD1
 * files; run it first).
 *
 *   node scripts/br/facades/bake.mjs [revision=facades-v1] [--chromium=/path]
 *
 * Reads art/br/<revision>.json, writes public/fps/br/models/atlas.<revision>.webp.
 */
import { build } from "esbuild";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const revision = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "facades-v1";
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const layout = JSON.parse(fs.readFileSync(path.join(root, `art/br/${revision}.json`), "utf8"));
const js = (
  await build({
    entryPoints: [path.join(root, "scripts/br/facades/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    logLevel: "error",
  })
).outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end('<!doctype html><script type="module" src="/bake.js"></script>');
  if (url === "/bake.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(root, "public", url);
  if (!file.startsWith(path.join(root, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.facades, null, { timeout: 60000 });
const base64 = await page.evaluate((l) => window.facades.bake(l), layout);
await browser.close();
server.close();
if (errors.length) {
  console.error(errors);
  process.exit(1);
}
const out = path.join(root, `public/fps/br/models/atlas.${revision}.webp`);
fs.writeFileSync(out, Buffer.from(base64, "base64"));
console.log(
  `${Object.keys(layout.models).length} models → ${path.relative(root, out)} ` +
    `(${layout.width} × ${layout.height}, ${Math.round(fs.statSync(out).size / 1024)} kB)`,
);
