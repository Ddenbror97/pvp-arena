/**
 * node scripts/br/icons/render.mjs [outDir] [id,id…] — renders the inventory icons (entry.ts)
 * with the headless Chromium and writes each, trimmed and centred on a 256 px transparent
 * square (guns: 504 × 224), as public/fps/br/icons/<item>.webp (or into outDir as PNG for a look).
 * TURNS='{"ak47":[0,180,0]}' turns a model (degrees) before its shot.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? path.join(ROOT, "public/fps/br/icons"));
const only = process.argv[3]?.split(",");
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/icons/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:transparent}</style><script>window.TURNS=${process.env.TURNS ?? "{}"}</script><script type=module src=/e.js></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/e.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.ready, null, { timeout: 120_000 });
const icons = await page.evaluate((o) => window.icons(o ?? undefined), only ?? null);
const webp = outDir.startsWith(path.join(ROOT, "public"));
for (const [id, url] of Object.entries(icons)) {
  const png = Buffer.from(url.split(",")[1], "base64");
  const img = sharp(png).trim({ threshold: 1 });
  // Guns keep their long shape (the weapon cards are wide); everything else fits a square.
  const gun = ["ak47", "m4", "awp", "hunting", "mp5", "deagle", "spas12"].includes(id);
  const figure = id.startsWith("char-");
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  const fitted = sharp(await img.png().toBuffer())
    .resize(gun ? 480 : figure ? 200 : 232, gun ? 200 : figure ? 480 : 232, {
      fit: "contain",
      background: clear,
    })
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: clear });
  if (webp)
    await fitted.webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(outDir, `${id}.webp`));
  else await fitted.png().toFile(path.join(outDir, `${id}.png`));
}
console.log("icons", Object.keys(icons).length, "→", outDir);
await browser.close();
server.close();
