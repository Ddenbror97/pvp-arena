/** node scripts/br/vehicle-check/capture.mjs <vehicles.glb> <outDir> [--wheels] — see entry.ts. */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const [glb, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/vehicle-check/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    logLevel: "error",
  })
).outputFiles[0].text;
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/e.js"))
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  if (req.url.startsWith("/vehicles.glb")) return fs.createReadStream(glb).pipe(res);
  res.end("<!doctype html><body style=margin:0><script type=module src=/e.js></script>");
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(
  `http://127.0.0.1:${server.address().port}/${process.argv.includes("--wheels") ? "?wheels=1" : ""}`,
);
await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
await page.evaluate(() => window.ready);
for (const v of ["three", "front", "side", "left", "right", "nose"]) {
  const url = await page.evaluate((x) => window.shot(x), v);
  fs.writeFileSync(path.join(outDir, `${v}.png`), Buffer.from(url.split(",")[1], "base64"));
}
console.log("ok");
await browser.close();
server.close();
