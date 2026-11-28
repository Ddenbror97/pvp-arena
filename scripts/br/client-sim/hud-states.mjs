/**
 * Screenshots of the BR HUD in fixed states (hud-states.tsx) over still game frames, for
 * before-and-after checks of the HUD's styles:
 *
 *   node scripts/br/client-sim/hud-states.mjs <outDir> <name=background.jpg>... [--size=1920x1080]
 *       [--scenes=plane,ground,kill,inventory] [--chromium=/path]
 *
 * Each scene is shot over each background (<name>-<scene>.png). The page bundles the HUD with
 * every stylesheet its components import, the game's own font, and the site's files (item art).
 */
import { build } from "esbuild";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const outDir = path.resolve(args[0]);
const backgrounds = args.slice(1).map((a) => a.split("="));
const opt = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const [W, H] = opt("size", "1920x1080").split("x").map(Number);
const scenes = opt("scenes", "plane,ground,kill,inventory").split(",");
const exe = opt("chromium", undefined);
fs.mkdirSync(outDir, { recursive: true });

const bundle = await build({
  entryPoints: [path.join(ROOT, "scripts/br/client-sim/hud-states.tsx")],
  bundle: true,
  write: false,
  outdir: path.join(outDir, ".bundle"),
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "@": path.join(ROOT, "src") },
  external: ["/fps/*", "/assets/*", "*.woff2", "*.png", "*.webp", "*.svg"],
  logLevel: "error",
});
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = [
  ...["src/components/fps/duel.css", "src/components/fps/br.css"].map((f) =>
    fs.readFileSync(path.join(ROOT, f), "utf8"),
  ),
  ...bundle.outputFiles.filter((f) => f.path.endsWith(".css")).map((f) => f.text),
].join("\n");
const font = fs.readFileSync(path.join(ROOT, "src/fonts/manrope-latin.woff2")).toString("base64");
const page = (bg, scene) =>
  `<!doctype html><meta charset=utf-8><style>@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400 900}:root{--font-sans:"Manrope",system-ui,sans-serif}html,body{margin:0;height:100%;overflow:hidden;font-family:var(--font-sans)}${css}</style><div class="duel-game br-game" style="position:relative;height:100%;background:url(/bg/${encodeURIComponent(bg)}) center/cover"><div id="hud"></div></div><script>window.SCENE=${JSON.stringify(scene)}</script><script type=module src=/e.js></script>`;
const bgFiles = Object.fromEntries(backgrounds.map(([n, f]) => [n, path.resolve(f)]));
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const m = url.match(/^\/page\/([^/]+)\/([^/]+)$/);
  if (m) return res.writeHead(200, { "content-type": "text/html" }).end(page(m[1], m[2]));
  if (url === "/e.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  if (url.startsWith("/bg/")) {
    const f = bgFiles[url.slice(4)];
    return f ? fs.createReadStream(f).pipe(res) : res.writeHead(404).end();
  }
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
// Reduced motion off: the shots are taken once the entrance animations have settled.
const tab = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
tab.on("pageerror", (e) => errors.push(e.message));
for (const [name] of backgrounds)
  for (const scene of scenes) {
    await tab.goto(`http://localhost:${server.address().port}/page/${name}/${scene}`);
    await tab.waitForLoadState("networkidle");
    // Past the KILLED confirmation's entrance (7–12 % of 2.6 s), before its exit.
    await tab.waitForTimeout(700);
    await tab.screenshot({ path: path.join(outDir, `${name}-${scene}.png`) });
    console.log(`${name}-${scene}`);
  }
await browser.close();
server.close();
fs.rmSync(path.join(outDir, ".bundle"), { recursive: true, force: true });
if (errors.length) {
  console.log("page errors:", errors);
  process.exitCode = 1;
}
