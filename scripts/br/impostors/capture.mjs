/**
 * Far-tree impostors: one transparent side-view image per tree model, written next to the
 * models (public/fps/br/models/<id>.impostor.png) and their sizes into models.json.
 *
 *   node scripts/br/impostors/capture.mjs [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const manifestPath = path.join(ROOT, "public/fps/br/models/models.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const trees = Object.entries(manifest.models).filter(([, m]) => m.class === "tree");
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/impostors/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>body{margin:0;background:transparent}</style><script type=module src='i.js'></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/i.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
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
const page = await browser.newPage({ viewport: { width: 256, height: 512 } });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.impostor === "function");
for (const [id, m] of trees) {
  const size = await page.evaluate(([f]) => window.impostor(f, 256, 512), [m.lods[0].file]);
  const out = path.join(ROOT, "public/fps/br/models", `${id}.impostor.png`);
  await page.locator("canvas").screenshot({ path: out, omitBackground: true });
  m.impostor = {
    file: `/fps/br/models/${id}.impostor.png`,
    width: +size.width.toFixed(2),
    height: +size.height.toFixed(2),
  };
  console.log(id, m.impostor, `${Math.round(fs.statSync(out).size / 1024)} kB`);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
await browser.close();
server.close();
