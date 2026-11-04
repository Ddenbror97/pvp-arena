/**
 * Screenshots of the BR bottom HUD alone (hud-preview.tsx) over a still frame:
 *   node scripts/br/client-sim/hud-preview.mjs <background.jpg> <outDir> [--chromium=/path]
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const [bg, outDir] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/client-sim/hud-preview.tsx")],
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
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  reducedMotion: "reduce",
});
for (const kit of ["armed", "low", "unarmed"]) {
  const html = `<!doctype html><meta charset=utf-8><style>@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400 800}:root{--font-sans:"Manrope",system-ui,sans-serif}html,body{margin:0;height:100%;font-family:var(--font-sans)}${css}</style><div class="duel-game br-game" style="background:url(data:image/jpeg;base64,${img}) center/cover"><div id="hud"></div></div><script type=module>${js.replace(/<\/script/g, "<\\/script")}</script>`;
  await page.setContent(
    html.replace(
      "<script type=module>",
      `<script>window.KIT=${JSON.stringify(kit)}</script><script type=module>`,
    ),
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, `hud-${kit}.png`) });
  console.log("hud", kit);
}
await browser.close();
