/**
 * Contact sheet of every processed Project Island model (LOD0 | LOD1 | LOD2), headless.
 *
 *   node scripts/br/model-review/capture.mjs [outDir] [--chromium=/path] [id ...]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const args = process.argv.slice(2);
const outDir = path.resolve(
  args[0] && !args[0].startsWith("--") ? args.shift() : "art/br/build/models",
);
const exe = args.find((a) => a.startsWith("--chromium="))?.slice(11);
const only = args.filter((a) => !a.startsWith("--"));
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/model-review/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
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
const page = await browser.newPage({ viewport: { width: 1500, height: 500 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
// REV=audit-v1 reviews a revision before world.ts points at it.
await page.goto(
  `http://127.0.0.1:${server.address().port}/` +
    (process.env.REV ? `?models=/fps/br/models/models.${process.env.REV}.json` : ""),
);
const manifest = await page.evaluate(() => window.review.ready);
for (const id of Object.keys(manifest.models).filter((i) => !only.length || only.includes(i))) {
  for (const [k, angle] of [0, Math.PI].entries()) {
    await page.evaluate(([i, a]) => window.review.show(i, a), [id, angle]);
    await page.screenshot({
      path: path.join(outDir, `${id}${k ? "-back" : ""}.jpg`),
      type: "jpeg",
      quality: 80,
    });
  }
}
console.log("errors", errors.length ? errors : "none");
await browser.close();
server.close();
