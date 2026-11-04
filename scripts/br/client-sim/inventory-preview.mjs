/**
 * Screenshots of the BR inventory alone (inventory-preview.tsx) over a still frame:
 *   node scripts/br/client-sim/inventory-preview.mjs <background.jpg> <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const [bg, outDir] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/client-sim/inventory-preview.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const font = fs.readFileSync(path.join(ROOT, "src/fonts/manrope-latin.woff2")).toString("base64");
const img = fs.readFileSync(bg).toString("base64");
const page = (kit) =>
  `<!doctype html><meta charset=utf-8><style>@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400 800}:root{--font-sans:"Manrope",system-ui,sans-serif}html,body{margin:0;height:100%;font-family:var(--font-sans)}${css}</style><div class="duel-game br-game" style="position:relative;height:100%;background:url(data:image/jpeg;base64,${img}) center/cover"><div id="hud"></div></div><script>window.KIT=${JSON.stringify(kit)}</script><script type=module src=/e.js></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url.startsWith("/page/")) return res.end(page(url.slice(6)));
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
const size = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1600x900")
  .split("x")
  .map(Number);
const tab = await browser.newPage({
  viewport: { width: size[0], height: size[1] },
  reducedMotion: "reduce",
});
tab.on("pageerror", (e) => console.log("pageerror", e.message));
for (const kit of (process.env.KITS ?? "full,empty").split(",")) {
  await tab.goto(`http://localhost:${server.address().port}/page/${kit}`);
  await tab.waitForTimeout(1200);
  await tab.screenshot({ path: path.join(outDir, `inventory-${kit}.png`) });
  console.log("inventory", kit);
}
await browser.close();
server.close();
