/** Native-browser input regression using the real arena and shared match, without production hooks. */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = process.cwd(),
  out = path.resolve(".wrangler/canopy-controls");
fs.mkdirSync(out, { recursive: true });
const bundle = await build({
  entryPoints: ["scripts/br/client-sim/entry.ts"],
  bundle: true,
  write: false,
  format: "esm",
  alias: { "@": path.resolve("src") },
  plugins: [
    {
      name: "short-countdown-in-harness",
      setup(b) {
        b.onLoad({ filter: /client-sim[/\\]entry\.ts$/ }, (args) => ({
          // Skip only the waiting period, not any flight or movement steps.
          contents: fs
            .readFileSync(args.path, "utf8")
            .replace("clock += TICK_MS;", 'clock += state.phase === "starting" ? 1000 : TICK_MS;'),
          loader: "ts",
        }));
      },
    },
  ],
});
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      '<!doctype html><style>html,body{margin:0;overflow:hidden}</style><script type="module" src="/sim.js"></script>',
    );
  if (url === "/sim.js")
    return res
      .writeHead(200, { "content-type": "text/javascript" })
      .end(bundle.outputFiles[0].text);
  const file = path.join(root, "public", url);
  if (!file.startsWith(path.join(root, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const report = { checks: [], errors: [] };
const delta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => report.errors.push(String(e)));
  await page.addInitScript(() => {
    window.__brAssumeLock = true;
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => !!window.sim, null, { timeout: 180000 });
  await page.evaluate(() => window.sim.ready);
  await page.waitForFunction(() => window.sim.status().phase === "plane", null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.sim.status().me.phase === "parachute", null, {
    timeout: 60000,
  });
  await page.waitForTimeout(1000);
  const status = () => page.evaluate(() => window.sim.status());
  const move = (x, y = 0) =>
    page.evaluate(
      ({ x, y }) =>
        window.dispatchEvent(new MouseEvent("mousemove", { movementX: x, movementY: y })),
      { x, y },
    );
  const button = (type, button) =>
    page.evaluate(({ type, button }) => window.dispatchEvent(new MouseEvent(type, { button })), {
      type,
      button,
    });
  const start = await status();
  await move(180);
  await page.waitForTimeout(600);
  const steering = await status();
  assert(
    Math.abs(delta(steering.input.canopyYaw, start.input.canopyYaw)) > 0.2,
    "mouse must change course",
  );
  report.checks.push("normal mouse steers");
  await page.waitForTimeout(2000);
  await button("mousedown", 2);
  await move(350, -45);
  await page.waitForTimeout(350);
  const looking = await status();
  assert(
    Math.abs(delta(looking.input.canopyYaw, steering.input.canopyYaw)) < 0.001,
    "right drag must preserve course",
  );
  assert(
    Math.abs(delta(looking.input.yaw, looking.input.canopyYaw)) > 0.4,
    "right drag must orbit camera",
  );
  assert.equal(looking.input.aim, false);
  report.checks.push("right drag looks around without steering or ADS");
  await page.screenshot({ path: path.join(out, "right-drag.png") });
  await button("mouseup", 2);
  await page.waitForTimeout(1200);
  const released = await status();
  assert(
    Math.abs(delta(released.input.yaw, released.input.canopyYaw)) < 0.015,
    "release must recenter",
  );
  report.checks.push("release recentres");
  await button("mousedown", 2);
  await move(160);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(1200);
  await move(100);
  await page.waitForTimeout(250);
  const blurred = await status();
  assert(
    Math.abs(delta(blurred.input.canopyYaw, released.input.canopyYaw)) > 0.1,
    "blur must clear free look",
  );
  report.checks.push("blur clears held free look");
  await page.keyboard.down("ControlLeft");
  await page.waitForFunction(
    () => ["ground", "swim"].includes(window.sim.status().me.phase),
    null,
    { timeout: 150000 },
  );
  await page.keyboard.up("ControlLeft");
  await page.waitForTimeout(500);
  const landed = await status();
  assert.equal(landed.input.canopyYaw, undefined, "landing must stop sending canopy targets");
  await move(100);
  await page.waitForTimeout(250);
  const foot = await status();
  assert(Math.abs(delta(foot.input.yaw, landed.input.yaw)) > 0.1, "on-foot mouse must still work");
  report.checks.push("landing restores ordinary mouse controls");
  await page.screenshot({ path: path.join(out, "landed.png") });
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report));
} finally {
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((r) => server.close(r));
}
