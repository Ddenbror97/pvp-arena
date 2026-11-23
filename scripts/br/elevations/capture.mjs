/**
 * Elevations of models' near LODs (entry.ts), for finding painted windows:
 *
 *   node scripts/br/elevations/capture.mjs <outDir> [--rev=<revision>] [--px=40] id …
 *
 * Writes <id>-<side>.png (side: front, back, left, right; u left to right as world +x for
 * front, −x… see meta) and <id>.json: the model's box, px per metre, and per side whether the
 * image is mirrored (u decreasing to the right).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { storedFile } from "../../../art/blender/br/model-files.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const args = process.argv.slice(2);
const outDir = path.resolve(args.shift());
const rev = args.find((a) => a.startsWith("--rev="))?.slice(6);
const px = Number(args.find((a) => a.startsWith("--px="))?.slice(5) ?? 40);
const exe = args.find((a) => a.startsWith("--chromium="))?.slice(11);
const ids = args.filter((a) => !a.startsWith("--"));
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/elevations/entry.ts")],
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
  const file = storedFile(url) ?? path.join(ROOT, "public", url);
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 4000, height: 2000 } });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.elevation);
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, `public/fps/br/models/models.${rev ?? "windows-v1"}.json`),
    "utf8",
  ),
);
for (const id of ids) {
  const file = manifest.models[id].lods[0].file;
  const meta = { file, px, sides: {} };
  for (const side of ["front", "back", "left", "right"]) {
    const r = await page.evaluate(([f, s, p]) => window.elevation(f, s, p), [file, side, px]);
    meta.box = r.box;
    // The image's left edge is the camera's left: looking −z (front) that is −x; looking +z
    // (back) +x; looking +x (the left side) −z; looking −x (the right side) +z: u runs left to right
    // for the front and the left side.
    meta.sides[side] = {
      width: r.width,
      height: r.height,
      mirrored: side === "back" || side === "right",
    };
    const canvas = await page.$("canvas");
    await canvas.screenshot({ path: path.join(outDir, `${id}-${side}.png`) });
  }
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(meta));
}
await browser.close();
server.close();
