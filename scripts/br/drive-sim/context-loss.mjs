/**
 * Lost graphics context check (headless Chromium, the real client against the in-page match):
 * the context is dropped under a running match as a driver reset or a crash of the browser's
 * graphics process drops it (owner, 2026-11-15: "randomly the screen turned white"), given back,
 * and the client must report both, draw the same scene again, and report a context that stays
 * away as stuck.
 *
 *   node scripts/br/drive-sim/context-loss.mjs [--shots=dir]
 *
 * What this cannot show: why a real card lost its context, or the browser coming back on
 * another GPU. The software renderer here always comes back as itself.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const shots = process.argv.find((a) => a.startsWith("--shots="))?.split("=")[1];
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/drive-sim/entry.tsx")],
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
// A white page, as the site's: a blank canvas shows it.
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#fff}#game{position:absolute;inset:0}#hud{display:none}</style><div id=game></div><div id=hud></div><script type=module src=/sim.js></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/sim.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror ${e}`));
page.on("console", (m) => {
  // GL errors after the context returned: something was drawn with state from the old context.
  // (Not the browser's note when something made before the loss is disposed after it: three.js
  // then deletes a buffer of the old context, which the new one refuses and ignores.)
  if (
    /GL_INVALID|INVALID_(OPERATION|VALUE|ENUM|FRAMEBUFFER)|GL ERROR/.test(m.text()) &&
    !/object does not belong to this context/.test(m.text())
  )
    problems.push(m.text());
});
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.sim?.ready, null, { timeout: 180000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** The share of the picture that is the page's white, and its mean colour. */
async function picture(name) {
  const png = await page.screenshot();
  if (shots) fs.writeFileSync(path.join(shots, `${name}.png`), png);
  return page.evaluate(async (b64) => {
    const image = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${b64}`)).blob(),
    );
    const c = new OffscreenCanvas(image.width, image.height);
    const g = c.getContext("2d");
    g.drawImage(image, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let white = 0;
    const mean = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) white++;
      for (let k = 0; k < 3; k++) mean[k] += d[i + k];
    }
    const n = d.length / 4;
    return { white: +(white / n).toFixed(3), mean: mean.map((v) => Math.round(v / n)) };
  }, png.toString("base64"));
}
const states = () => page.evaluate(() => window.sim.graphics().map((g) => g.state));
const until = async (state, count, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if ((await states()).filter((s) => s === state).length >= count) return true;
    await wait(250);
  }
  return false;
};
if (shots) fs.mkdirSync(shots, { recursive: true });
await wait(12000);
const before = await picture("1-before");
const drawn = () => page.evaluate(() => window.sim.calls());
const callsBefore = await drawn();

// A short loss: the picture goes, the client says so, and it comes back.
await page.evaluate(() => window.sim.loseContext(1500));
await wait(700);
const during = await picture("2-lost");
const restored = await until("restored", 1, 120000);
await wait(6000);
const after = await picture("3-restored");
const callsAfter = await drawn();

// A context that stays away is reported as stuck, and a late return still resumes.
await page.evaluate(() => window.sim.loseContext(11000));
const stuck = await until("stuck", 1, 15000);
const restoredAgain = await until("restored", 2, 120000);
await wait(6000);
const afterStuck = await picture("4-restored-after-stuck");
const report = {
  before,
  during,
  after,
  afterStuck,
  callsBefore,
  callsAfter,
  events: await page.evaluate(() => window.sim.graphics()),
  problems,
};
const drift = (a, b) => Math.max(...a.mean.map((v, i) => Math.abs(v - b.mean[i])));
const ok =
  restored &&
  stuck &&
  restoredAgain &&
  during.white > 0.95 &&
  after.white < 0.5 &&
  drift(before, after) < 12 &&
  drift(before, afterStuck) < 12 &&
  callsAfter > 0 &&
  problems.length === 0;
console.log(JSON.stringify(report, null, 1));
console.log(ok ? "OK" : "FAILED");
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
