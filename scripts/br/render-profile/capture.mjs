import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { build } from "esbuild";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
const label = process.argv[2] ?? "current";
const root = process.cwd();
const result = await build({
  entryPoints: ["scripts/br/render-profile/entry.ts"],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  alias: { "@": path.join(root, "src") },
  loader: { ".webp": "dataurl", ".png": "dataurl" },
  plugins: [
    {
      name: "bench-only",
      setup(b) {
        b.onLoad({ filter: /br-(arena|viewmodel)\.ts$/ }, async (args) => {
          let contents = label.startsWith("baseline")
            ? execFileSync(
                "git",
                ["show", "92c7b373:" + path.relative(root, args.path).replaceAll("\\", "/")],
                { encoding: "utf8" },
              )
            : fs.readFileSync(args.path, "utf8");
          contents = contents.replace(
            "renderer.outputColorSpace = THREE.SRGBColorSpace;",
            `const rawRender=renderer.render.bind(renderer); renderer.render=(...args:Parameters<typeof renderer.render>)=>{const t=performance.now();rawRender(...args);(globalThis as any).__benchRendered(renderer,performance.now()-t);}; renderer.outputColorSpace = THREE.SRGBColorSpace;`,
          );
          contents = contents.replace(
            "&& budget.update(dtMs))",
            "&& false && budget.update(dtMs))",
          );
          contents = contents.replace(
            "const { selectMs } = island.update(camera);",
            "const { selectMs } = island.update(camera); (globalThis as any).__qaSelect=selectMs;",
          );
          return { contents, loader: "ts" };
        });
      },
    },
  ],
  logLevel: "error",
});
fs.mkdirSync(".wrangler/br-profile", { recursive: true });
fs.writeFileSync(".wrangler/br-profile/" + label + ".js", result.outputFiles[0].text);
const html =
  '<!doctype html><style>html,body{margin:0;overflow:hidden}</style><script type="module" src="/bench.js"></script>';
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/bench.js")
    return res
      .writeHead(200, { "content-type": "text/javascript" })
      .end(result.outputFiles[0].text);
  const file = path.join(root, "public", url);
  if (!file.startsWith(path.join(root, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  const ext = path.extname(file);
  const types = {
    ".json": "application/json",
    ".glb": "model/gltf-binary",
    ".webp": "image/webp",
    ".png": "image/png",
  };
  res.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const report = { label, scenes: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  if (process.argv.includes("--visibility-only"))
    await page.addInitScript(() => {
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) {
          super(...args);
          (window.__qaAudioContexts ??= []).push(this);
        }
      };
    });
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto("http://127.0.0.1:" + server.address().port + "/");
  await page.waitForFunction(() => !!window.bench, { timeout: 120000 });
  await page.evaluate(() => window.bench.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
  if (process.argv.includes("--visibility-only")) {
    await page.keyboard.press("KeyW");
    await page.waitForFunction(() => window.__qaAudioContexts?.some((c) => c.state === "running"));
    const visibility = await page.evaluate(() => window.bench.visibility());
    visibility.audioUnlockedByKey = await page.evaluate(() =>
      window.__qaAudioContexts.some((c) => c.state === "running"),
    );
    report.visibility = visibility;
    console.log(JSON.stringify({ visibility, errors: report.errors }));
    await page.screenshot({ path: `.wrangler/br-profile/${label}-visibility.png` });
  } else if (process.argv.includes("--recover-only")) {
    const stats = await page.evaluate(() => window.bench.run("town", "ultra", 60));
    const recovery = await page.evaluate(() => window.bench.recover());
    report.scenes.push({ ...stats, recovery });
    if (recovery.supported && !recovery.recovered) throw new Error("Context recovery failed");
    await page.screenshot({ path: `.wrangler/br-profile/${label}-restored.png` });
    console.log(JSON.stringify({ recovery, errors: report.errors }));
  } else
    for (const scene of ["airfield", "town"]) {
      for (const quality of ["medium", "ultra"]) {
        await cdp.send("Profiler.start");
        const stats = await page.evaluate(
          ({ scene, quality }) => window.bench.run(scene, quality, 360),
          { scene, quality },
        );
        const { profile } = await cdp.send("Profiler.stop");
        fs.writeFileSync(
          `.wrangler/br-profile/${label}-${scene}-${quality}.cpuprofile`,
          JSON.stringify(profile),
        );
        const hits = new Map();
        for (const n of profile.nodes) {
          const name = n.callFrame.functionName || "(anonymous)";
          hits.set(name, (hits.get(name) ?? 0) + (n.hitCount ?? 0));
        }
        stats.hotspots = [...hits].sort((a, b) => b[1] - a[1]).slice(0, 15);
        delete stats.arena.body;
        report.scenes.push(stats);
        fs.writeFileSync(
          ".wrangler/br-profile/" + label + ".json",
          JSON.stringify(report, null, 2),
        );
        console.log(JSON.stringify(stats));
        await page.screenshot({ path: `.wrangler/br-profile/${label}-${scene}-${quality}.png` });
      }
    }
} catch (e) {
  report.failure = String(e);
  console.log(JSON.stringify({ failure: String(e) }));
  process.exitCode = 1;
} finally {
  fs.writeFileSync(".wrangler/br-profile/" + label + ".json", JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((r) => server.close(r));
}
