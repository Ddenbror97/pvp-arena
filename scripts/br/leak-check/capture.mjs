/**
 * BR arena GPU-leak check (cleanup 2026-11-09): mounts the real arena with the island assets
 * on headless Chromium, disposes it, and repeats. After each teardown the renderer must track
 * no geometry and no texture beyond three.js's own floor, and the counts while mounted must
 * not grow cycle to cycle. Anything uploaded during the match that the teardown never disposed
 * is named.
 *
 *   node scripts/br/leak-check/capture.mjs [--cycles=3] [--chromium=/path] [--reversed]
 *
 * --reversed runs the opt-in reversed-Z path (scene-target.ts) instead of logarithmic depth.
 * --tier=low runs the low hardware tier (quality-tier.ts); the default pins "standard", since
 * the software renderer here would otherwise be detected as low.
 *
 * Exit code 1 on a leak. Before the 2026-11-09 fix the arena left the 100 operator rigs, the
 * rifle kit and the grenade renderer on the GPU every match.
 */
import { build } from "esbuild";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const flag = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const cycles = Number(flag("cycles") ?? 3);
/** Textures three.js holds for an empty shadowed scene (shadow map, its depth, defaults). */
const FLOOR = { geometries: 3, textures: 3 };
// Allow one-time module/decoder warm-up, but catch an arena held alive after
// teardown even when its disposed GPU objects no longer show in renderer.info.
const RETAINED_HEAP_MB = 64;

const js = (
  await build({
    entryPoints: [path.join(root, "scripts/br/leak-check/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(root, "src") },
    define: { "process.env.NODE_ENV": '"production"', "import.meta.env.DEV": "false" },
    logLevel: "error",
  })
).outputFiles[0].text;
const types = {
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".webp": "image/webp",
  ".png": "image/png",
  ".hf": "application/octet-stream",
  ".lc": "application/octet-stream",
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      '<!doctype html><style>html,body{margin:0}</style><script type="module" src="/leak.js"></script>',
    );
  if (url === "/leak.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(root, "public", url);
  if (!file.startsWith(path.join(root, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const exe = flag("chromium");
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--enable-precise-memory-info",
    "--js-flags=--max-old-space-size=4096",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const tier = flag("tier") ?? "standard";
await page.addInitScript((t) => localStorage.setItem("br-tier", t), tier);
if (process.argv.includes("--reversed"))
  await page.addInitScript(() => localStorage.setItem("br-depth", "reversed"));
const cdp = await page.context().newCDPSession(page);
// The page asks for a heap snapshot between "rendered" and "dispose": every live Texture.
await page.exposeFunction("__snapshotHeap", async () => {
  await cdp.send("HeapProfiler.collectGarbage");
  const { result: proto } = await cdp.send("Runtime.evaluate", {
    expression: "window.leak.THREE.Texture.prototype",
  });
  const { objects } = await cdp.send("Runtime.queryObjects", { prototypeObjectId: proto.objectId });
  const { result } = await cdp.send("Runtime.callFunctionOn", {
    objectId: objects.objectId,
    functionDeclaration: "function() { return window.leak.snapshotUploaded(this); }",
    returnByValue: true,
  });
  // The query result is a remote handle: released, or it keeps every Texture alive and the
  // check reports its own retention as the arena's.
  await cdp.send("Runtime.releaseObject", { objectId: objects.objectId }).catch(() => {});
  await cdp.send("Runtime.releaseObject", { objectId: proto.objectId }).catch(() => {});
  return result.value;
});
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.leak, { timeout: 120000 });
await page.evaluate(() => {
  window.__snapshot = () => window.__snapshotHeap();
});
const runs = [];
page.on("crash", () => console.error("page crashed"));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 200));
});
for (let i = 0; i < cycles; i++) {
  await cdp.send("HeapProfiler.collectGarbage");
  const heapBefore = Math.round((await page.evaluate(() => window.leak.heap())) / 1e6);
  try {
    runs.push(...(await page.evaluate(() => window.leak.run(1))));
  } catch (e) {
    console.error(
      `cycle ${i + 1} failed: ${e.message.split("\n")[0]}; JS heap before it: ${heapBefore} MB; after cycle ${i}:`,
      runs.at(-1)?.jsHeapMB,
      "MB",
    );
    console.error("console errors so far:", JSON.stringify(errors.slice(-8), null, 1));
    process.exit(1);
  }
  await cdp.send("HeapProfiler.collectGarbage");
  runs.at(-1).heapBeforeMB = heapBefore;
  runs.at(-1).jsHeapMB = Math.round((await page.evaluate(() => window.leak.heap())) / 1e6);
  runs.at(-1).heapUsage = await cdp.send("Runtime.getHeapUsage");
  if (flag("snapshot") && i === cycles - 1) {
    // A full heap snapshot after the last teardown, for retainer analysis (tooling).
    const chunks = [];
    cdp.on("HeapProfiler.addHeapSnapshotChunk", (p) => chunks.push(p.chunk));
    await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
    fs.writeFileSync(flag("snapshot"), chunks.join(""));
  }
  if (flag("classes")) {
    // Which three.js classes still have live instances after this teardown (growth = retention).
    const counts = {};
    for (const name of [
      "Mesh",
      "InstancedMesh",
      "BufferGeometry",
      "MeshStandardMaterial",
      "Texture",
      "Object3D",
      "Skeleton",
      "Bone",
      "AnimationMixer",
      "WebGLRenderer",
      "Scene",
    ]) {
      const { result: proto } = await cdp.send("Runtime.evaluate", {
        expression: `window.leak.THREE.${name}.prototype`,
      });
      const { objects } = await cdp.send("Runtime.queryObjects", {
        prototypeObjectId: proto.objectId,
      });
      const { result: n } = await cdp.send("Runtime.callFunctionOn", {
        objectId: objects.objectId,
        functionDeclaration: "function(){return this.length}",
        returnByValue: true,
      });
      counts[name] = n.value;
      await cdp.send("Runtime.releaseObject", { objectId: objects.objectId }).catch(() => {});
      await cdp.send("Runtime.releaseObject", { objectId: proto.objectId }).catch(() => {});
    }
    runs.at(-1).classes = counts;
  }
}
await browser.close();
server.close();

console.log(JSON.stringify({ cycles: runs, errors }, null, 1));
const over = runs.filter(
  (r) => r.left.geometries > FLOOR.geometries || r.left.textures > FLOOR.textures,
);
// Mounted counts depend a little on how far LOD selection got when they were read: a leak is
// growth in every cycle, by more than 2 % from first to last.
const grows = (key) =>
  runs.length > 2 &&
  runs.every((r, i) => i === 0 || r[key] > runs[i - 1][key]) &&
  runs.at(-1)[key] > runs[0][key] * 1.02;
const growth = grows("geometries") || grows("textures");
const retained = runs.filter((r) => r.retained.length);
const heapRetained = runs.filter((r) => r.jsHeapMB - runs[0].heapBeforeMB > RETAINED_HEAP_MB);
if (over.length || growth || retained.length || heapRetained.length || errors.length) {
  console.error(
    over.length
      ? `LEAK: ${over.length} teardown(s) left GPU objects beyond three's floor`
      : growth
        ? "LEAK: mounted counts grow across cycles"
        : retained.length
          ? "LEAK: authored assets still retained after dispose"
          : heapRetained.length
            ? `LEAK: teardown retains more than ${RETAINED_HEAP_MB} MB above the initial heap`
            : "page errors",
  );
  process.exit(1);
}
console.log(`ok: ${cycles} mount/dispose cycles, nothing left on the GPU`);
