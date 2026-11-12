/**
 * What the 5v5 client allocates per frame (headless Chromium): the real renderer with an
 * in-page room and ten bots playing, under the sampling heap profiler.
 *
 *   node scripts/fps/bomb-harness/alloc.mjs [--map=iron-district] [--seconds=30] [--chromium=/path]
 *
 * The GL draw calls are no-ops once the match is live. SwiftShader draws a few frames a second,
 * and at that rate the frame loop never gets hot: V8 keeps running it in the interpreter, which
 * boxes every number it touches, and the figures are the interpreter's, not the game's. Without
 * the drawing the same frame loop runs at the display's rate and is compiled as on a real
 * machine. Only what is allocated under the renderer's frame callback is counted (the in-page
 * room and its bots are the server's work).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const MAP = arg("map", "iron-district");
const seconds = Number(arg("seconds", 30));
const exe = arg("chromium");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/fps/bomb-harness/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    loader: { ".webp": "empty", ".png": "empty", ".css": "empty" },
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
// --keep=<file>: the bundle the profile's line numbers refer to.
if (arg("keep")) fs.writeFileSync(arg("keep"), js);
// --programs: also count how often three works out a material's shader program again while
// playing, and for which material on which object. A material shared by meshes that need
// different programs (instanced and not, skinned and not) is resolved again at every switch.
const marker =
  "function getParameters(material, lights, shadows, scene, object, lightProbeGrids) {";
const countPrograms = process.argv.includes("--programs");
if (countPrograms && !js.includes(marker)) throw new Error("three's getParameters not found");
const served = countPrograms
  ? js.replace(
      marker,
      `${marker}
    if (window.__programs) {
      const process_detail = ${process.argv.includes("--detail")};
      const g = object.geometry?.attributes ?? {};
      const k = material.type + " " + material.name + " on " + object.type + " " + (object.name || object.parent?.name || "") + (process_detail ? " [object " + object.uuid.slice(0, 4) + ", material version " + material.version + ", scene " + scene.uuid.slice(0, 4) + (scene.environment ? " env" : "") + (material.envMap ? " own-env" : "") + (g.tangent ? " tangents" : "") + (g.color ? " colours" + g.color.itemSize : "") + (object.isSkinnedMesh ? " skinned" : "") + ", fog " + !!scene.fog + ", lights " + (lights && lights.state ? lights.state.version : "-") + "]" : "");
      window.__programs.set(k, (window.__programs.get(k) || 0) + 1);
    }`,
    )
  : js;
const types = { ".glb": "model/gltf-binary", ".wasm": "application/wasm" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0;background:#000'><script type=module src='/h.js'></script></body></html>",
    );
  if (url === "/h.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(served);
  const file = path.join(ROOT, "public", url);
  if (
    !file.startsWith(path.join(ROOT, "public")) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
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
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.addInitScript(() => {
  const gl = WebGL2RenderingContext.prototype;
  for (const name of [
    "drawArrays",
    "drawElements",
    "drawArraysInstanced",
    "drawElementsInstanced",
    "drawRangeElements",
  ]) {
    const real = gl[name];
    gl[name] = function (...args) {
      if (!window.__noDraw) return real.apply(this, args);
    };
  }
});
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.harness === "object");
await page.evaluate((m) => window.harness.start(0, m), MAP);
await page.evaluate(() => {
  window.harness.live();
  window.__noDraw = true;
});
// The local player runs and turns, the bots play: let the frame loop get hot first.
await page.keyboard.down("KeyW");
const turn = async (ms) => {
  for (const end = Date.now() + ms; Date.now() < end;) {
    await page.evaluate(() => {
      window.harness.turn(0.25);
      window.harness.state().roundEndsAt = Date.now() + 3_600_000;
    });
    await page.waitForTimeout(250);
  }
};
await turn(20000);
const cdp = await page.context().newCDPSession(page);
await cdp.send("HeapProfiler.enable");
await cdp.send("HeapProfiler.startSampling", {
  samplingInterval: 4096,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
});
if (countPrograms) await page.evaluate(() => (window.__programs = new Map()));
const frames0 = await page.evaluate(() => window.harness.diagnostics().renderFrames);
const began = Date.now();
await turn(seconds * 1000);
const frames = (await page.evaluate(() => window.harness.diagnostics().renderFrames)) - frames0;
const elapsed = (Date.now() - began) / 1000;
const heap = await cdp.send("HeapProfiler.stopSampling");
await page.keyboard.up("KeyW");
const alloc = new Map();
let inFrame = 0,
  outside = 0;
(function walk(n, under) {
  const here = under || /^frame\d*$/.test(n.callFrame.functionName);
  const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`;
  if (n.selfSize) {
    if (here) {
      alloc.set(k, (alloc.get(k) ?? 0) + n.selfSize);
      inFrame += n.selfSize;
    } else outside += n.selfSize;
  }
  n.children?.forEach((c) => walk(c, here));
})(heap.profile.head, false);
const state = await page.evaluate(() => {
  const s = window.harness.state();
  return { phase: s.phase, round: s.round, alive: s.players.filter((p) => p.hp > 0).length };
});
console.log(
  `${MAP}: ${frames} frames in ${elapsed.toFixed(0)} s (${(frames / elapsed).toFixed(0)} a second), ${JSON.stringify(state)}`,
);
console.log(
  `allocated under frame(): ${(inFrame / 1024 / frames).toFixed(2)} kB a frame (${(inFrame / 1048576 / elapsed).toFixed(2)} MB a second); elsewhere on the page ${(outside / 1048576 / elapsed).toFixed(2)} MB a second`,
);
console.log(
  [...alloc]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k, v]) => `${(v / frames).toFixed(0).padStart(7)} B/frame  ${k}`)
    .join("\n"),
);
if (countPrograms) {
  const rows = await page.evaluate(() => [...window.__programs].sort((a, b) => b[1] - a[1]));
  console.log(
    `programs worked out again: ${(rows.reduce((n, r) => n + r[1], 0) / frames).toFixed(1)} a frame`,
  );
  for (const [k, n] of rows.slice(0, 25))
    console.log(`${(n / frames).toFixed(2).padStart(7)} a frame  ${k}`);
}
await browser.close();
server.close();
