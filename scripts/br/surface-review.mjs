/** Fixed native-GPU surface comparison. Run before/after with the same assets and machine. */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { chromium } from "playwright";
const label = process.argv[2] ?? "current";
const baseline = process.argv.find((arg) => arg.startsWith("--baseline="))?.slice(11);
const out = path.resolve(".wrangler/br-surfaces");
fs.mkdirSync(out, { recursive: true });
const bundle = await build({
  entryPoints: ["scripts/br/explorer/entry.ts"],
  bundle: true,
  write: false,
  format: "esm",
  alias: { "@": path.resolve("src") },
  plugins: [
    {
      name: "surface-baseline",
      setup(b) {
        if (!baseline) return;
        b.onLoad({ filter: /[/\\](terrain|vegetation-renderer)\.ts$/ }, (args) => ({
          contents: execFileSync(
            "git",
            [
              "show",
              baseline + ":" + path.relative(process.cwd(), args.path).replaceAll("\\", "/"),
            ],
            { encoding: "utf8" },
          ),
          loader: "ts",
        }));
      },
    },
  ],
});
const root = path.resolve("public");
const server = http.createServer((req, res) => {
  if (req.url === "/")
    return res.end(
      '<style>body{margin:0;overflow:hidden}pre{display:none}</style><script type="module" src="/scene.js"></script>',
    );
  if (req.url === "/scene.js")
    return res
      .writeHead(200, { "content-type": "text/javascript" })
      .end(bundle.outputFiles[0].text);
  const file = path.resolve(root, "." + req.url.split("?")[0]);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const report = { label, errors: [], scenes: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404")) report.errors.push(m.text());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => !!window.explorer, { timeout: 120000 });
  await page.evaluate(() => window.explorer.ready);
  await page.evaluate(() => window.explorer.setPixelRatio(1));
  for (const scene of ["aerial", "meadow", "mountain"]) {
    const result = await page.evaluate(async (scene) => {
      const e = window.explorer;
      const p =
        scene === "aerial"
          ? [0, 800, 2200]
          : scene === "meadow"
            ? [230, e.groundAt(230, 2100) + 2, 2100]
            : [-300, 510, -3100];
      const target =
        scene === "aerial"
          ? [0, 40, 0]
          : scene === "meadow"
            ? [100, e.groundAt(100, 1900), 1900]
            : [-491.5, 350, -4288.1];
      const cpu = [];
      let stats;
      const frames = [];
      let last = performance.now();
      for (let i = 0; i < 240; i++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        const t = performance.now();
        stats = await e.view(p, target);
        if (i >= 60) {
          cpu.push(performance.now() - t);
          frames.push(now - last);
        }
        last = now;
      }
      const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
      const gl = document.querySelector("canvas").getContext("webgl2");
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        scene,
        cpuMs: mean(cpu),
        frameMs: mean(frames),
        stats,
        buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
      };
    }, scene);
    report.scenes.push(result);
    await page.screenshot({ path: path.join(out, `${label}-${scene}.png`) });
    console.log(JSON.stringify(result));
  }
  if (report.errors.length) throw Error(report.errors.join("\n"));
} finally {
  fs.writeFileSync(path.join(out, label + ".json"), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((r) => server.close(r));
}
