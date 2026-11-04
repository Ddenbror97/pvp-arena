/** Contact sheet of processed models (lod0): node scripts/br/map-audit/sheet.mjs <out.png> <id> … (up to 12). */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const ROOT = process.cwd();
const out = process.argv[2];
const ids = process.argv.slice(3);
const js = (
  await build({
    entryPoints: [path.join(path.dirname(new URL(import.meta.url).pathname), "sheet-entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    logLevel: "error",
    nodePaths: [path.join(ROOT, "node_modules")],
  })
).outputFiles[0].text;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/")
    return res.end("<!doctype html><body style=margin:0><script type=module src=/e.js></script>");
  if (u === "/e.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const f = path.join(ROOT, "public", u);
  if (!fs.existsSync(f)) return res.writeHead(404).end();
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
p.on("pageerror", (e) => console.log(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/`);
await p.waitForFunction(() => window.render);
await p.evaluate((ids) => window.render(ids), ids);
await p.screenshot({ path: out });
await b.close();
server.close();
