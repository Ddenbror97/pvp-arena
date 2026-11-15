/**
 * Tactical Tablet review (headless Chromium): the tablet over a still of the island at several
 * sizes and states, and a click-through (pick, replace, take out, the third pick locking in).
 *
 *   node scripts/br/tablet-review/capture.mjs [outDir] [--chromium=/path]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/tablet",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/tablet-review/entry.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    alias: { "@": path.join(ROOT, "src") },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;font-family:system-ui;background:linear-gradient(#8fb4d6 0 45%,#5d7a48 45% 100%)}#hud{position:absolute;inset:0}${css}</style><div class="br-game" id=hud></div><script type=module src=/t.js></script>`;
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/t.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  res.writeHead(200, { "content-type": "text/html" }).end(html);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}) });
const errors = [];
const open = async (w, h, query) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`);
  await page.waitForFunction(() => window.ready);
  await page.waitForSelector(".br-tablet");
  return page;
};
const mid = "active=scavenger,quick-hands";
for (const [name, w, h, query] of [
  ["1-fresh-1920", 1920, 1080, ""],
  ["2-loadout-1920", 1920, 1080, mid],
  ["3-loadout-1600", 1600, 900, mid],
  ["4-loadout-1280", 1280, 720, mid],
  ["5-loadout-1024", 1024, 600, mid],
]) {
  const page = await open(w, h, query);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  await page.close();
}
// The click-through, on the real rules: pick, replace within a column, take out, lock in.
const page = await open(1600, 900, "");
const pick = (name) =>
  page.locator(".br-pick", { has: page.locator("b", { hasText: new RegExp(`^${name}$`, "i") }) });
const active = () => page.locator(".br-tablet-head dd.is-active").innerText();
const report = {};
await pick("Scavenger").click();
report.note1 = await page.locator(".br-tablet-note").innerText();
await pick("Lightweight").click(); // replaces the common pick
report.common = await page.locator(".br-tablet-col.common h3 span").innerText();
await pick("Quick Hands").click();
report.active = await active();
report.lockHint = await pick("Tracker").locator("em").innerText();
await page.screenshot({ path: path.join(outDir, "6-two-picked.png") });
await pick("Quick Hands").click(); // takes it out
report.afterTakeOut = await active();
await pick("Quick Hands").click();
await pick("Tracker").click(); // the third: locks in (the review keeps the tablet)
report.three = await active();
report.picked = await page.locator(".br-pick.on b").allInnerTexts();
await page.screenshot({ path: path.join(outDir, "7-three.png") });
report.errors = errors;
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
await browser.close();
server.close();
