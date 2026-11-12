/**
 * Battle royale client profile (headless): the real client on the ground in the in-page match,
 * running forward and turning, under the JS CPU profiler and the sampling heap profiler.
 * Writes outDir/client.cpuprofile and outDir/alloc.json (allocated bytes by function).
 * SwiftShader draws on the CPU, so GL calls dominate the wall time; the JS side is what to read.
 *
 *   node scripts/br/client-sim/profile.mjs [outDir] [--chromium=/path] [--seconds=40]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : "art/br/build/client-profile",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const seconds = Number(process.argv.find((a) => a.startsWith("--seconds="))?.slice(10) ?? 40);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/client-sim/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='sim.js'></script>";
const workerJs = (
  await build({
    entryPoints: [path.join(ROOT, "src/lib/fps/br/tactical-map.worker.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    logLevel: "error",
  })
).outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/tactical-map.worker.ts")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(workerJs);
  if (url === "/") return res.end(html);
  if (url === "/sim.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/?loot=1`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 180000 });
await page.evaluate(() => window.sim.ready);
const status = () => page.evaluate(() => window.sim.status());
for (const t = Date.now(); (await status()).phase !== "plane";) {
  if (Date.now() - t > 240000) throw new Error("no plane");
  await new Promise((r) => setTimeout(r, 500));
}
// Open ground with the other player an arm's length ahead (one figure in view).
await page.evaluate(() => window.sim.knifeSetup(false));
await new Promise((r) => setTimeout(r, 8000));
const cdp = await page.context().newCDPSession(page);
await page.evaluate(() => {
  window.__frames = 0;
  const f = () => (window.__frames++, requestAnimationFrame(f));
  requestAnimationFrame(f);
});

await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
await cdp.send("HeapProfiler.enable");
await cdp.send("HeapProfiler.startSampling", {
  samplingInterval: 16384,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
});
await cdp.send("Profiler.start");
const frames0 = await page.evaluate(
  () =>
    new Promise((r) => {
      let n = 0;
      const t = performance.now();
      const f = () => (++n, performance.now() - t < 3000 ? requestAnimationFrame(f) : r(n / 3));
      requestAnimationFrame(f);
    }),
);
await page.keyboard.down("KeyW");
const end = Date.now() + seconds * 1000;
let yaw = 0;
while (Date.now() < end) {
  await page.mouse.move(480 + Math.sin((yaw += 0.4)) * 200, 270);
  await new Promise((r) => setTimeout(r, 400));
}
await page.keyboard.up("KeyW");
const { profile } = await cdp.send("Profiler.stop");
const heap = await cdp.send("HeapProfiler.stopSampling");
fs.writeFileSync(path.join(outDir, "client.cpuprofile"), JSON.stringify(profile));
// Allocation under the arena's frame callback only (the in-page match and its bots are the
// room's work, not the client's), by function and per frame.
const frames = await page.evaluate(() => window.__frames);
const alloc = new Map();
let inFrame = 0;
(function walk(n, under) {
  const here = under || n.callFrame.functionName === "frame";
  const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`;
  if (here && n.selfSize) {
    alloc.set(k, (alloc.get(k) ?? 0) + n.selfSize);
    inFrame += n.selfSize;
  }
  n.children?.forEach((c) => walk(c, here));
})(heap.profile.head, false);
const top = [...alloc].sort((a, b) => b[1] - a[1]).slice(0, 40);
fs.writeFileSync(
  path.join(outDir, "alloc.json"),
  JSON.stringify({ frames, inFrame, top }, null, 1),
);
console.log("fps (software)", frames0.toFixed(1), JSON.stringify((await status()).me));
console.log(
  `frames ${frames}, allocated in frame(): ${(inFrame / 1024 / frames).toFixed(1)} kB a frame`,
);
console.log(
  top
    .slice(0, 25)
    .map(([k, v]) => `${(v / 1024 / frames).toFixed(2).padStart(8)} kB/frame  ${k}`)
    .join("\n"),
);
await browser.close();
server.close();
