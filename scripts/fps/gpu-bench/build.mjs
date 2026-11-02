/**
 * Build the real-hardware benchmark into one folder: index.html, bench.js, bundled assets and
 * the game's models (public/fps/models). Open it in any browser on the machine under test.
 *
 *   node scripts/fps/gpu-bench/build.mjs <outDir>
 *
 * Query: ?sample=20000 (ms per map), ?cycles=2, ?auto=1 (start without the button).
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "dist/gpu-bench");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../../..");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "fps/models"), { recursive: true });
await build({
  entryPoints: [path.join(HERE, "entry.ts")],
  bundle: true,
  outfile: path.join(out, "bench.js"),
  format: "esm",
  target: "es2022",
  minify: true,
  loader: {
    ".webp": "file",
    ".png": "file",
    ".jpg": "file",
    ".glb": "file",
    ".mp3": "file",
    ".ogg": "file",
    ".wav": "file",
    ".svg": "file",
    ".css": "empty",
  },
  assetNames: "assets/[name]-[hash]",
  publicPath: "./",
  logLevel: "error",
});
for (const f of fs.readdirSync(path.join(ROOT, "public/fps/models")))
  if (f.endsWith(".glb"))
    fs.copyFileSync(path.join(ROOT, "public/fps/models", f), path.join(out, "fps/models", f));
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FPS GPU benchmark</title>
<style>html,body{margin:0;height:100%;background:#111;color:#ddd;font:12px/1.4 ui-monospace,monospace}#host{position:fixed;inset:0}#panel{position:fixed;left:8px;top:8px;right:8px;z-index:2;pointer-events:none}#start{pointer-events:auto;font:inherit;padding:6px 12px;margin-bottom:6px}#results{white-space:pre;overflow-x:auto;background:rgba(0,0,0,.6);padding:6px;margin:0 0 6px;pointer-events:auto}#results:empty{display:none}#log{pointer-events:auto;white-space:pre-wrap;background:rgba(0,0,0,.6);padding:6px;max-height:45vh;overflow:auto;margin:0}</style></head>
<body><div id="host" class="duel-render-host"></div><div id="panel"><button id="start">Start benchmark (keep this window visible and focused)</button><pre id="results"></pre><pre id="log"></pre></div>
<script type="module" src="./bench.js"></script></body></html>`,
);
const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else files.push([path.relative(out, p), fs.statSync(p).size]);
  }
};
walk(out);
console.log(
  JSON.stringify({
    out,
    files: files.length,
    MB: +(files.reduce((a, [, s]) => a + s, 0) / 1048576).toFixed(1),
  }),
);
