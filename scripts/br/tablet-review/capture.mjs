/**
 * Tactical Tablet review (headless Chromium): the tablet over a still of the island at several
 * sizes and states, and a click-through (unlock, equip, replace, unequip).
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
const mid =
  "data=7&unlocked=quick-hands,iron-plates,tracker,field-medic&active=quick-hands,tracker,iron-plates";
for (const [name, w, h, query] of [
  ["1-fresh-1920", 1920, 1080, "data=3"],
  ["2-loadout-1920", 1920, 1080, mid],
  ["3-loadout-1600", 1600, 900, mid],
  ["4-loadout-1280", 1280, 720, mid],
  ["5-loadout-1024", 1024, 600, mid],
]) {
  const page = await open(w, h, query);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  await page.close();
}
// The click-through, on the real rules: unlock, equip, replace, unequip, the epic filter.
const page = await open(1600, 900, "data=12");
const card = (name) =>
  page.locator(".br-perk", { has: page.locator("b", { hasText: new RegExp(`^${name}$`, "i") }) });
const report = {};
await card("Quick Hands").locator("button").click();
report.unlocked = await card("Quick Hands").locator(".br-perk-state").innerText();
report.note1 = await page.locator(".br-tablet-note").innerText();
await card("Quick Hands").locator("button").click();
report.equipped = await card("Quick Hands").locator(".br-perk-on").innerText();
await card("Tracker").locator("button").click();
await card("Tracker").locator("button").click();
report.data = await page.locator(".br-tablet-head dd.data").innerText();
report.active = await page.locator(".br-tablet-head dd").nth(2).innerText();
await card("Scavenger").locator("button").click();
await page.locator(".br-tablet-slot").nth(0).click();
await card("Scavenger").locator("button").click();
report.replaced = await page.locator(".br-tablet-slot").nth(0).locator("b").innerText();
report.note2 = await page.locator(".br-tablet-note").innerText();
report.poor = await card("Deadly Precision").locator("button").isDisabled();
report.unavailable = await card("Battle Hardened").locator("button").count();
await page.screenshot({ path: path.join(outDir, "6-after-clicks.png") });
await page.locator(".br-tablet-slot").nth(1).locator(".br-tablet-x").click();
report.afterUnequip = await page.locator(".br-tablet-head dd").nth(2).innerText();
await page.locator(".br-tablet-tabs [role=tab]", { hasText: "Epic" }).click();
report.epicCards = await page.locator(".br-perk").count();
await page.screenshot({ path: path.join(outDir, "7-epic.png") });
report.errors = errors;
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
await browser.close();
server.close();
